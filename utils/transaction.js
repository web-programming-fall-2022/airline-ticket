import axios, {isCancel, AxiosError} from 'axios';


async function createTransaction(purchaseId, amount, receiptId) {
  const url = `${process.env.BANK_INTERNAL_URL}/transaction/`;
  return axios.post(url, {
    amount: amount,
    receipt_id: receiptId,
    callback: `${process.env.FRONTEND_URL}/complete-transaction/${purchaseId}`,
  })
}

export default createTransaction;
