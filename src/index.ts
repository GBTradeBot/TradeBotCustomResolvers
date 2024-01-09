import { ApolloServer, gql } from 'apollo-server';
import {
  sendSolveSbcHttp,
  sendToManagerHttp,
  sendToRabbit,
} from './services/MessagingService';
import { groupBy } from './utils/utils';
import AccToStart from './interfaces/AccToStart';

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
    server_id: Int!
  }

  input RabbitPayloadByServers {
    accounts: [AccountPayload]
    type: String!
    rabbitUrl: String!
  }

  input SBCPayload {
    account_ids: [Int]!
    to_solve: String!
  }

  type Mutation {
    sendCommand(payload: RabbitPayload!): String!
    sendCommandHttp(payload: RabbitPayload!): String!
    solveSbcHttp(payload: SBCPayload): String!
    sendStartByServers(payload: RabbitPayloadByServers): String!
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
        const accs: AccToStart[] = args.payload.accounts;
        const accsByServer = groupBy(accs, 'server_id');
        console.log(accsByServer);
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
  },
  Query: {
    Orders: (parent: any, args: any, context: any, info: any) => {
      return args.id;
    },
  },
};

async function run() {
  // await messagingService.start();

  const server = new ApolloServer({ typeDefs, resolvers });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

run();
