import amqplib from 'amqplib';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const connectionUrl = process.env.RABBITMQ_URL!;
console.log(connectionUrl);

export async function sendToRabbit(toSend: any) {
  const queue = 'scheduler-tasks';
  const conn = await amqplib.connect(connectionUrl);

  const ch1 = await conn.createChannel();
  await ch1.assertQueue(queue, { durable: false });

  const ch2 = await conn.createChannel();

  ch2.sendToQueue(queue, Buffer.from(toSend));
}

export async function sendToManagerHttp() {
  const response = await axios.post(
    'http://amqp.console-bot.com:15672/api/exchanges/Trading/http.scheduler-tasks/publish',
    {
      properties: {},
      routing_key: '',
      payload: 'test2',
      payload_encoding: 'string',
    },
    {
      auth: {
        username: 'TradeBot',
        password: `62fj45l65'b26456`,
      },
    }
  );
  console.log(response);
}
