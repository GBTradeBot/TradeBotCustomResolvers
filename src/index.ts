import { ApolloServer, gql } from 'apollo-server';
import {
  sendChangeConfig,
  sendSolveSbcHttp,
  sendToManagerHttp,
  sendToRabbit,
} from './services/MessagingService';
import { configToMs, groupBy, sleep } from './utils/utils';
import AccToStart from './interfaces/AccToStart';
import { duration } from 'moment';
import DB, { Account } from './services/DB';
import { createClient as createTradeClient } from './../generated/trade';

const typeDefs = gql`
  input RabbitPayload {
    id: Int!
    email: String!
    type: String!
    rabbitUrl: String!
  }

  input AccountPayload {
    id: Int!
    email: String!
    service_name: String!
  }

  input RabbitPayloadByServers {
    accounts: [AccountPayload]
    type: String!
    secondsBetween: Int!
    maxAccsToStart: Int!
    rabbitUrl: String!
  }

  input SBCPayload {
    account_ids: [Int]!
    to_solve: String!
  }

  input Config {
    maxTimeToTrySbc: Int
    sbcDuration: Int
    shouldTrySbc: Boolean
  }

  input ChangeConfigPayload {
    account_ids: [Int]!
    config: Config
  }

  type Mutation {
    sendCommand(payload: RabbitPayload!): String!
    sendCommandHttp(payload: RabbitPayload!): String!
    solveSbcHttp(payload: SBCPayload): String!
    sendStartByServers(payload: RabbitPayloadByServers): String!
    changeConfig(payload: ChangeConfigPayload): String!
  }

  type Query {
    Orders(id: ID!): ID!
  }
`;

const resolvers = {
  Mutation: {
    sendCommand: async (parent: any, args: any, context: any, info: any) => {
      console.log(args.payload);
      const response = await sendToRabbit(JSON.stringify(args.payload));
      return 'success';
    },
    sendCommandHttp: async (
      parent: any,
      args: any,
      context: any,
      info: any
    ) => {
      const newToSend = {
        id: args.payload.id,
        email: args.payload.email,
        type: args.payload.type,
      };
      const response = await sendToManagerHttp(
        args.payload.rabbitUrl,
        JSON.stringify(newToSend)
      );
      return 'success';
    },
    sendStartByServers: async (
      parent: any,
      args: any,
      context: any,
      info: any
    ) => {
      try {
        const maxAccsByService = 93;
        const accs: AccToStart[] = args.payload.accounts;
        const freeSpaceByService = await getFreeSpaceByService(maxAccsByService);
        const accountsGroupedForStart = selectSubsetsByFreeSpace(accs, freeSpaceByService);

        await startAccsByService(
          args.payload.rabbitUrl,
          accountsGroupedForStart,
          maxAccsByService,
          Math.min(...Array.from(freeSpaceByService).map((v) => v[1])),
        );

        return 'success';
      } catch (err: any) {
        console.log('error while starting accs:' + err);
        return 'error';
      }
    },
    solveSbcHttp: async (parent: any, args: any, context: any, info: any) => {
      const newToSend = {
        accounts: args.payload.account_ids,
        challengeName: args.payload.to_solve,
      };
      const response = await sendSolveSbcHttp(JSON.stringify(newToSend));
      return 'success';
    },
    changeConfig: async (parent: any, args: any, context: any, info: any) => {
      for (const account_id of args.payload.account_ids) {
        const newToSend = {
          type: 'WORKER_PERSONAL_COMMAND',
          sender: 'admin-page',
          data: {
            accountId: account_id,
            newConfig: configToMs(args.payload.config),
            type: 'CHANGE_CONFIG',
          },
        };
        const response = await sendChangeConfig(JSON.stringify(newToSend));
      }

      return 'success';
    },
  },
  Query: {
    Orders: (parent: any, args: any, context: any, info: any) => {
      return args.id;
    },
  },
};

async function startAccs(accs: AccToStart[], rabbitUrl: string, secondBetween: number, maxAccsToStart: number) {
  const timeToWaitOnServer = duration(secondBetween, 'seconds').asMilliseconds();
  const accsWithCeiling = accs.slice(0, maxAccsToStart)
  for (const acc of accsWithCeiling) {
    await sendToManagerHttp(
      rabbitUrl,
      JSON.stringify({
        id: acc.id,
        email: acc.email,
        type: 'START',
      })
    );
    await sleep(timeToWaitOnServer);
  }
}

async function getFreeSpaceByService(maxFreeSpacePerService: number): Promise<Map<string, number>> {
  const db: DB = new DB(
    createTradeClient({
      url: process.env.TRADE_ENDPOINT,
      headers: {
        'x-hasura-admin-secret': process.env.TRADE_HASURA_ADMIN_SECRET!,
      },
    }),
  );
  await sleep(1000);

  const allActiveAccounts = await db.getAllActiveAccounts();
  const allLaunchedAccounts = allActiveAccounts.map((acc) => ({
    id: acc.id,
    serviceName: acc.scheduler_account_info?.service_name ?? null,
  }));
  
  const accsByService = groupBy(allLaunchedAccounts, 'serviceName');

  const resultMap = new Map<string, number>();
  for (const [serviceName, accounts] of accsByService.entries()) {
    if (serviceName === null) {
      continue;
    }

    resultMap.set(serviceName, Math.max(maxFreeSpacePerService - accounts.length, 0));
  }

  return resultMap;
}

function selectSubsetsByFreeSpace<T extends { id: number, service_name: string }>(
  sortedAccounts: T[],
  freeSpaceByService: Map<string, number>,
): T[][] {
  const accountsByService = groupBy(sortedAccounts, 'service_name') as Map<string, T[]>;
  let maxFreeSpace = 0;

  for (const [serviceName, serviceAccounts] of accountsByService) {
    const serviceFreeSpace = freeSpaceByService.get(serviceName) || 0;

    if (serviceFreeSpace > maxFreeSpace) {
      maxFreeSpace = serviceFreeSpace;
    }

    accountsByService.set(serviceName, serviceAccounts.slice(0, serviceFreeSpace));
  }

  const resultArray: T[][] = [];

  for (let i = 0; i < maxFreeSpace; i += 1) {
    const subArray: T[] = [];

    accountsByService.forEach((allServiceAccounts) => {
      if (allServiceAccounts[i]) {
        subArray.push(allServiceAccounts[i]);
      }
    });

    resultArray.push(subArray);
  }

  return resultArray; 
}

async function startAccsByService(
  rabbitUrl: string,
  accountsGroups: Account[][],
  maxFreeSpace: number,
  currentFreeSpace: number
) {
  for (let i = 0; i < accountsGroups.length; i++) {
    const accountsGroup = accountsGroups[i];

    const secondsBetween = getSecondsBetweenStart(
      maxFreeSpace, 
      Math.max(currentFreeSpace - i, 1)
    );
    
    for (const account of accountsGroup) {
      const accountId = account.id!;
      const accountEmail = account.email!;

      const command = {
        id: accountId,
        email: accountEmail,
        type: 'START',
      }

      // console.log(command);
  
      await sendToManagerHttp(
        rabbitUrl,
        JSON.stringify(command)
      );
    }

    await sleep(duration(secondsBetween, 'seconds').asMilliseconds());
  }
}

function getSecondsBetweenStart(maxFreeSpace: number, freeSpace: number): number {
  const minSeconds = 10;
  const maxSeconds = 20;

  const freeSpacePercents = freeSpace / maxFreeSpace;
  return minSeconds + Math.round((1 - freeSpacePercents) * (maxSeconds - minSeconds));
}

async function run() {
  // await messagingService.start();

  const server = new ApolloServer({ typeDefs, resolvers });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

run();

