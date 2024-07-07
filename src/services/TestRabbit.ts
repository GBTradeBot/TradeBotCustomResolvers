import amqplib from 'amqplib';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const connectionUrl = process.env.RABBITMQ_URL!;
console.log(connectionUrl);

export async function listenToQueue(queueName: string) {
  let connection = await amqplib.connect(connectionUrl);
  const ch1 = await connection.createChannel();
  ch1.consume(queueName, (msg) => {
    const messageString = msg!.content.toString();
    ch1.ack(msg!);
  });
}

export async function sendToManagerHttp(toSend: string) {
  const response = await axios.post(
    process.env.RABBIT_HTTP_URL!,
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
