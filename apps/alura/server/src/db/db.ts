import mysql from "mysql2/promise";
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  multipleStatements: true,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export type attrTableKey = 'designer' | 'collection' | 'season' | 'category' | 'style' | 'fabric' | 'stretch type' | 'pattern' | 'fit type' | 'sleeve length' | 'sleeve type' | 'length' | 'hem shape' | 'neckline' | 'neck height' | 'waist line' | 'color' | 'model';

export const attrTables: Record<attrTableKey, string> = {
  'designer' : 'PRODUCTS_DESIGNERS',
  'collection' : 'PRODUCTS_COLLECTIONS',
  'season' : 'PRODUCTS_SEASONS',
  'category' : 'PRODUCTS_CATEGORIES',
  'style' : 'PRODUCTS_STYLES',
  'fabric' : 'PRODUCTS_FABRICS',
  'stretch type' : 'PRODUCTS_STRETCH_TYPES',
  'pattern' : 'PRODUCTS_PATTERNS',
  'fit type' : 'PRODUCTS_FIT_TYPES',
  'sleeve length' : 'PRODUCTS_SLEEVE_LENGTHS',
  'sleeve type' : 'PRODUCTS_SLEEVE_TYPES',
  'length' : 'PRODUCTS_LENGTHS',
  'hem shape' : 'PRODUCTS_HEM_SHAPES',
  'neckline' : 'PRODUCTS_NECKLINES',
  'neck height' : 'PRODUCTS_NECK_HEIGHTS',
  'waist line' : 'PRODUCTS_WAIST_LINES',
  'color' : 'PRODUCTS_COLORS',
  'model' : 'MODELS'
};

export default db;