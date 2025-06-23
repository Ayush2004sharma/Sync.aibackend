import Redis from "ioredis";



const redisCLient= new Redis({
  host:process.env.REDIS_HOST,
  port:process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
})

redisCLient.on('connect', () => {
  console.log('Redis connected successfully');
})

export default redisCLient;