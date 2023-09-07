import { ApolloServer, gql } from 'apollo-server';
import { sendToManagerHttp, sendToRabbit } from './services/MessagingService';

const typeDefs = gql`
  input RabbitPayload {
    id: Int!
    email: String!
    type: String!
    rabbitUrl: String!
  }

  type Mutation {
    sendCommand(payload: RabbitPayload!): String!
    sendCommandHttp(payload: RabbitPayload!): String!
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

  server.listen(3000).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

run();
