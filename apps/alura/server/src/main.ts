import express, { json } from "express";
import cors from "cors";
import productRoutes from './routes/productRoutes.ts'
import authRoutes from './routes/authRoutes.ts'
import sessionMW from "./middleware/session.ts";

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // your frontend's address
  credentials: true,               // allow sending cookies/session info
}));
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMW);

app.use('/ui-images', express.static('public/ui-images'));
app.use('/products', express.static('public/products'));
app.use('/models', express.static('public/models'));


// Use your routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});