import * as express from 'express'
import {PrismaClient} from '@prisma/client'
import toJson from '../utils/toJson.js'
import createTransaction from '../utils/transaction'
import requireAuthentication from '../utils/authentication'

const prisma = new PrismaClient()
const router = express.Router();

router.get('/origin-dest', async function get_origin_destination(req, res) {
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

router.get('/available-offers', async function get_available_offers(req, res) {
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

router.post('/purchase', requireAuthentication, async function purchase(req, res) {
  const {flight_serial, flight_class, quantity} = req.body;
  const result = await prisma.available_offers.findFirst({
    where: {
      flight_serial: flight_serial,
    }
  });
  if (!result) {
    res.json({
      error: 'No such flight',
    }).status(400);
  }

  if (result[`${flight_class}_class_free_capacity`] < quantity) {
    res.json({
      error: 'Not enough seats',
    }).status(400);
  }

  const newQuantity = result[`${flight_class}_class_free_capacity`] - quantity;
  const updated = await prisma.available_offers.update({
    where: {
      flight_serial: flight_serial,
    }
  }, {
    [`${flight_class}_class_free_capacity`]: newQuantity,
  });

  const price = updated[`${flight_class}_price`];

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
    const transactionId = await createTransaction(purchase.purchase_id, price * quantity);
    await prisma.transaction.create({
      data: {
        purchase_id: purchase.purchase_id,
        payment_id: transactionId,
        payment_amount: price * quantity,
        payment_status: 'pending',
        payment_date: new Date(),
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

router.post('/update-transaction/:paymentId', requireAuthentication, async function update_transaction(req, res) {
  const transaction = await prisma.transaction.update({
    where: {
      payment_id: req.params.paymentId,
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
  if (req.body.status === 'success') {
    const purchase = await prisma.purchase.findFirst({
      where: {
        purchase_id: transaction.purchase_id,
      }
    })

    await prisma.available_offers.findFirst({
      where: {
        flight_serial: purchase.flight_serial
      }
    }).then((result) => {
      const newQuantity = result[`${purchase.offer_class}_class_free_capacity`] - purchase.offer_quantity;
      return prisma.available_offers.update({
        where: {
          flight_serial: purchase.flight_serial,
        }
      }, {
        [`${purchase.offer_class}_class_free_capacity`]: newQuantity,
      });
    }).catch((e) => {
      console.log(e);
      res.json({
        error: 'Error while updating available offers',
      }).status(500);
    });
  }

  res.json({
    message: 'Transaction updated',
  }).status(200);
})

router.get('/purchases', requireAuthentication, async function get_purchases(req, res) {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 1000;
  try {
    const result = await prisma.purchase.findMany({
      where: {
        corresponding_user_id: req.user.id,
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
