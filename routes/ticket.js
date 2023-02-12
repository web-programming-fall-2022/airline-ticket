import * as express from 'express'
import {PrismaClient} from '@prisma/client'
import toJson from '../utils/toJson.js'
import createTransaction from '../utils/transaction.js'
import requireAuthentication from '../utils/authentication.js'
import {getRandomInt} from "../utils/random.js";

const prisma = new PrismaClient()
const router = express.Router();

router.get('/origin-dest', async function (req, res) {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 1000;
  const result = await prisma.origin_destination.findMany({
    skip: offset,
    take: limit,
  })
  const totalCount = await prisma.origin_destination.count()
  res.json({
    data: result,
    count: result.length,
    totalCount: totalCount,
  })
});

router.get('/available-offers', async function (req, res) {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 1000;
  const result = await prisma.available_offers.findMany({
    skip: offset,
    take: limit,
  })
  const totalCount = await prisma.available_offers.count()
  res.send(toJson({
    data: result,
    count: result.length,
    totalCount: totalCount,
  }))
});

router.post('/purchase', requireAuthentication, async function (req, res) {
  const {flight_serial, flight_class, quantity} = req.body;
  const result = await prisma.available_offers.findFirst({
    where: {
      flight_serial: flight_serial,
    }
  });
  if (!result) {
    res.json({
      error: 'No such flight',
    }).status(404);
  }

  if (result[`${flight_class}_class_free_capacity`] < quantity) {
    res.json({
      error: 'Not enough seats',
    }).status(400);
  }

  const price = result[`${flight_class}_price`];

  const purchase = await prisma.purchase.create({
    data: {
      flight_serial: flight_serial,
      corresponding_user_id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      offer_price: price,
      offer_class: flight_class,
      offer_quantity: quantity,
    }
  });

  try {
    const receiptId = getRandomInt(0, 1000000000)
    const response = await createTransaction(purchase.purchase_id, price * quantity, receiptId);
    const transactionId = response.data.id
    await prisma.transaction.create({
      data: {
        purchase: {connect: {purchase_id: purchase.purchase_id}},
        payment_id: transactionId,
        payment_amount: price * quantity,
        payment_status: 'pending',
        payment_date: new Date(),
        receipt_id: receiptId,
      }
    });
    res.json({
      "redirect_url": `${process.env.BANK_URL}/payment/${transactionId}`,
    }).status(200);
  } catch (e) {
    console.log(e);
    res.json({
      error: 'Error while creating transaction',
    }).status(500);
  }
})

router.post('/update-transaction/:paymentId', requireAuthentication, async function (req, res) {
  if (!req.body.status) {
    res.json({
      error: 'Invalid status',
    }).status(400)
    return
  }
  const paymentId = parseInt(req.params.paymentId)
  if (!paymentId) {
    res.json({
      error: 'Invalid paymentId',
    }).status(400)
    return
  }
  const foundTransaction = await prisma.transaction.findFirst({
    where: {
      payment_id: paymentId,
    }
  })
  if (!foundTransaction) {
    res.json({
      error: 'Transaction not found',
    }).status(404)
    return
  }
  const transaction = await prisma.transaction.update({
    where: {
      transaction_id: foundTransaction.transaction_id
    },
    data: {
      payment_status: req.body.status,
    }
  }).catch((e) => {
    console.log(e);
    res.json({
      error: 'Error while updating transaction',
    }).status(500);
  });

  res.json({
    message: 'Transaction updated',
  }).status(200);
})

router.get('/purchases', requireAuthentication, async function (req, res) {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 1000;
  try {
    const result = await prisma.purchase.findMany({
      where: {
        corresponding_user_id: req.user.id,
      },
      include: {
        flight: true,
        transaction: true,
      },
      skip: offset,
      take: limit,
    });
    res.json({
      data: result,
    })
  } catch (e) {
    console.log(e);
    res.json({
      error: 'Error while getting purchases',
    }).status(500);
  }
});

export default router;
