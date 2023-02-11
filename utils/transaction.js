import axios, {isCancel, AxiosError} from 'axios';


async function createTransaction(purchaseId, amount) {
  const url = `${process.env.BANK_URL}/transaction/`;
  axios.post(url, {
    amount: amount,
    receipt_id: process.env.BANK_RECEIPT_ID,
    callback: `${process.env.FRONTEND_URL}/complete-transaction/${purchaseId}`,
  })
}

export default createTransaction;
