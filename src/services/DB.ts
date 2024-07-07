import { Client as GqlTradeClient } from '../../generated/trade';
import moment from 'moment';

export type Account = NonNullable<Awaited<ReturnType<DB['getAccounts']>>>[0];

export default class DB {
  constructor(
    protected readonly graphqlTradeClient: GqlTradeClient,
  ) {}

  async getAccounts(strategyName: string, workshift: number) {
    try {
      const response = await this.graphqlTradeClient.query({
        accounts: {
          __args: {
            where: {
              strategy_name: { _eq: strategyName },
              workshift_id: { _eq: workshift },
            },
          },
          id: true,
          email: true,
        },
      });

      return response.accounts;
    } catch (error) {
      console.log('DB ERROR: getAccounts error', error);
      return [];
    }
  }

  async getAllActiveAccounts() {
    try {
      const response = await this.graphqlTradeClient.query({
        accounts: {
          __args: {
            where: {
              activity_status: { _in: ['ON', 'PAUSED'] },
            },
          },
          id: true,
          scheduler_account_info: {
            service_name: true,
          }
        },
      });

      return response.accounts;
    } catch (error) {
      console.log('DB ERROR: getAccounts error', error);
      return [];
    }
  }
}
