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

export async function sendToManagerHttp(rabbitUrl: string, toSend: string) {
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

export async function sendSolveSbcHttp(toSend: any) {
  const response = await axios.post(
    process.env.SBC_RABBIT_HTTP_URL!,
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

export async function serviceHasConsumer(serviceName: string) {
  try {
    const response = await axios.get(
      `${process.env.RABBIT_HTTP_URL_BASE!}/api/queues/Trading/${serviceName}`,
      {
        auth: {
          username: process.env.RABBIT_LOGIN!,
          password: process.env.RABBIT_PASS!,
        },
      }
    );

    const queue = response.data;
    return queue && queue.consumers && queue.consumers > 0;
  } catch (error) {
    console.log('Error serviceHasConsumer: ' + error);
    return false;
  }
}

export async function sendChangeConfig(toSend: any) {
  console.log(toSend);
  const response = await axios.post(
    process.env.FLOW_RABBIT_HTTP_URL!,
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
