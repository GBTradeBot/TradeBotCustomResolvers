import { generate } from '@genql/cli';
import dotenv from 'dotenv';

dotenv.config();

const scalarTypes = {
  bigint: 'number',
  numeric: 'number',
  timestamp: 'string',
  uuid: 'string',
  MongoID: 'string',
  Date: 'Date',
  float8: 'number'
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
generateGraphQLInterfaces();

async function generateGraphQLInterfaces() {
  await generateTradeGraphQLInterfaces();
}

async function generateTradeGraphQLInterfaces() {
  await generate({
    endpoint: process.env.TRADE_ENDPOINT,
    output: 'generated/trade',
    verbose: true,
    headers: {
      'x-hasura-admin-secret': process.env.TRADE_HASURA_ADMIN_SECRET!
    },
    scalarTypes
  });
}
