import express, { json } from "express";
import cors from "cors";
import productRoutes from './routes/productRoutes.js'
import authRoutes from './routes/authRoutes.js'
import sessionMW from "./middleware/session.js";

const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ?  // your frontend's address
    'https://admin-alura.tmalhassan.com' : 
    'http://localhost:5173'
  ,
  credentials: true,                              // allow sending cookies/session info
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


const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});