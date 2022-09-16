import { ApolloServer, gql } from 'apollo-server';
import { sendToRabbit } from './services/MessagingService';

const typeDefs = gql`
  input RabbitPayload {
    accountId: String!
    email: String!
    type: String!
  }

  type Mutation {
    sendCommand(payload: RabbitPayload!): String!
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
