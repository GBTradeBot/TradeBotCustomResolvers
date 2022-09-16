import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const connectionUrl = process.env.RABBITMQ_URL!;
console.log(connectionUrl);

export async function sendToRabbit(toSend: any) {
  const queue = 'scheduler-tasks';
  const conn = await amqplib.connect(connectionUrl);

  const ch1 = await conn.createChannel();
  await ch1.assertQueue(queue, { durable: false });

  const ch2 = await conn.createChannel();

  setInterval(() => {
    ch2.sendToQueue(queue, Buffer.from(toSend));
  }, 1000);
}
