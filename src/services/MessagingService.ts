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

export async function sendToManagerHttp(rabbitUrl: string, toSend: any) {
  // console.log(rabbitUrl);
  // console.log(toSend);
  const response = await axios.post(
    rabbitUrl || process.env.RABBIT_HTTP_URL!,
    {
      properties: {},
      routing_key: '',
      payload: toSend,
      payload_encoding: 'string',
    },
    {
      auth: {
        username: process.env.RABBIT_LOGIN!,
        password: process.env.RABBIT_PASS!,
      },
    }
  );
}
