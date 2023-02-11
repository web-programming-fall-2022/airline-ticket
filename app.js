import express from "express"
import cookieParser from "cookie-parser";
import logger from "morgan";

import ticketRouter from "./routes/ticket.js";

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use('/api/v1/ticket', ticketRouter);

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
