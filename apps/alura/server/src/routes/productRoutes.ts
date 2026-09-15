import express from 'express';
import upload from '../middleware/upload.js';
import db, { attrTables, type attrTableKey } from '../db/db.js';
import fs from 'fs/promises';
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import path from 'path';
import util from 'util';
import { API_PATHS } from '../../../shared/constants/apiRouts.js';
import { fileURLToPath } from "url";
import type { ColorKey, ColorVariant, newColorType, ProductData, ProductPreview, sizeKey, SizeMeasurements, SizeStockBatch, VarSizeStock } from '../../../shared/types/ProductTypes.js';
import type { Change, ChangeOp, ChangeVal } from '../../../shared/types/ChangeTypes.js';
import type { ServerApiResponse, ServerResponseCodes, ServerResponseTypes } from '../../../shared/types/ServerResponseTypes.js';
import sanitizeChangesForAudit from '../tools/sanitizeForAudit.js';
import validateParams from '../tools/validateQueryParams.js';
import sharp from 'sharp';
import isOfType from '../tools/isOfType.js';

type attrOptions = {
    name: string;
}

type colorOptions = attrOptions & {
    sc: string;
}

type modelOptions = {
    'model-id': number;
    'model-f-name': string;
    'model-l-name': string;
    'model-tel-number': string;
    'model-height': number;
    'model-waist': number;
    'model-bust': number;
    'model-hips': number;
    'model-ig-acc': string;
    'model-pfp': string;
}

type ResultsTypes = { result: ProductPreview[] | ProductData[] | attrOptions[] | colorOptions[] | modelOptions[] } & RowDataPacket

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post(API_PATHS.PRODUCTS.ADD_PRODUCT, upload.any(), async (req, res) => {
    console.log('add new product request!!');
    // validate session and authentication
    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    const files = req.files as Express.Multer.File[];
    const modifVarImgsOrder: Record<ColorKey, number[]> = req.body.modifVarImgs ? JSON.parse(req.body.modifVarImgs) : {};
    const productDic: ProductData = JSON.parse(req.body.data);

    const userId = req.session.user.id;
    const uploadUID = req.body.uuid as string;

    const connection = await db.getConnection();

    function BuildProductsQueryString() {
        const fields: string[] = [];
        const values: (string | null | number)[] = [];

        // name_en, original_price, discount_price
        fields.push(`\`name_en\``, `\`original_price\``, `\`discount_price\``);
        values.push(productDic.name_en ?? null, productDic.original_price ?? null, productDic.discount_price ?? null);

        for (const [attribute, value] of Object.entries(productDic.attributes)) {
            fields.push(`${attribute}`);
            values.push(value ?? null);
        }

        // created by push
        fields.push(`\`created_by\``, `\`last_modified\``, `\`modified_by\``);
        values.push(userId, null, null);

        return { fields, values }
    }

    function BuildSizesQueryString(sizeMeasurements: SizeMeasurements) {
        const fields: string[] = [];
        const values: (number | string | null)[] = [];

        for (const [sizeAttribute, value] of Object.entries(sizeMeasurements)) {
            fields.push(`\`${sizeAttribute}\``);
            values.push(value ?? null);
        }

        return { fields, values }
    }

    try {
        // Start a transaction
        await connection.beginTransaction();
        const modifColorImgs: string[] = [];

        const prodQueryObj = BuildProductsQueryString();
        const productsQuery = `INSERT INTO \`PRODUCTS\` (${prodQueryObj.fields.join(', ')}) VALUES (${Array(prodQueryObj.fields.length).fill('?').join(', ')});`;

        console.log(mysql.format(productsQuery, prodQueryObj.values));
        const [productsRes] = await connection.query<ResultSetHeader>(productsQuery, prodQueryObj.values);

        const productID = productsRes.insertId;
        console.log('Created product ID: ', productID);



        // search tags
        for (const tag of productDic['search-tags']) {
            // check if search word already exists
            const [res] = await connection.query<RowDataPacket[]>('SELECT * FROM `SEARCH_WORDS` WHERE `name` = ?', [tag]);

            if (res.length > 0) {
                // console.log(util.inspect(res, { depth: null, colors: true }));
                await connection.query('INSERT INTO `PRODUCTS_TAGS` (`product-id`, `tag`) VALUES (?, ?)', [productID, tag]);
            } else {
                // add to search  words 
                const [addTagQueryRes] = await connection.query<ResultSetHeader>('INSERT INTO `SEARCH_WORDS` (`name`) VALUES (?)', [tag]);

                if (addTagQueryRes.affectedRows > 0) {
                    // successful... add the word to products-tags
                    await connection.query('INSERT INTO `PRODUCTS_TAGS` (`product-id`, `tag`) VALUES (?, ?)', [productID, tag]);
                }
            }
        }

        // sizes
        for (const [size, sizeMeasurements] of Object.entries(productDic.sizes)) {
            const sizesQueryObj = BuildSizesQueryString(sizeMeasurements);
            const sizesQuery = `INSERT INTO PRODUCTS_VARIATIONS_S (\`product-id\`, \`size-code\`, ${sizesQueryObj.fields.join(", ")}) VALUES (?, ?, ${Array(sizesQueryObj.fields.length).fill('?').join(', ')})`;
            sizesQueryObj.values.unshift(productID, size);

            console.log(mysql.format(sizesQuery, sizesQueryObj.values));
            await connection.query<ResultSetHeader>(sizesQuery, sizesQueryObj.values);
        }

        // vars + stock
        for (const [varCC, variantDetails] of Object.entries(productDic.vars)) {
            const varImgsCount = variantDetails['var-imgs'].length;
            const modelID = variantDetails.model['model-id'];

            const variantAddQuery = `INSERT INTO PRODUCTS_VARIATIONS_C (\`product-id\`, \`color-code\`, \`var-imgs\`, \`var-model\`, \`is_deleted\`) VALUES (?, ?, ?, ?, ?)`;
            const varAddQueryValues = [productID, varCC, varImgsCount, modelID, false];

            console.log(mysql.format(variantAddQuery, varAddQueryValues));
            const [variantAddRes] = await connection.query<ResultSetHeader>(variantAddQuery, varAddQueryValues);

            const variantID = variantAddRes.insertId;

            // add stock
            for (const [sizeName, sizeStock] of Object.entries(variantDetails.varSizesQuantity)) {
                const stockInsertQuery = `INSERT INTO PRODUCTS_VARIATIONS_STOCK (\`variant_id\`, \`size_code\`) VALUES (?, ?)`;

                console.log(mysql.format(stockInsertQuery, [variantID, sizeName]));
                const [stockInsertRes] = await connection.query<ResultSetHeader>(stockInsertQuery, [variantID, sizeName]);
    
                const stockID = stockInsertRes.insertId;

                for (const { current_available, is_active } of sizeStock.stock_batches) {
                    const batchInsertQuery = `INSERT INTO PRODUCTS_VARIATIONS_STOCK_BATCHES (\`stock_id\`, \`current_available\`, \`is_active\`) VALUES (?, ?, ?)`;
                    const batchInsertQueryValues = [stockID, current_available, is_active];

                    await connection.query<ResultSetHeader>(batchInsertQuery, batchInsertQueryValues);
                }
            }



            // variant images
            const uploadDir = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`, `/${productID}${varCC}`); // temp upload directory
            const VarImgsFiles = files.filter(img => img.fieldname.split('-')[0] === varCC);

            for (const file of VarImgsFiles) {
                const [, index] = file.fieldname.split('-');
                await fs.mkdir(uploadDir, { recursive: true });

                const originalPath = path.join(uploadDir, `${index}.webp`);
                const thumbnailPath = path.join(uploadDir, `${index}-thumb.webp`);

                // Save original
                await fs.writeFile(originalPath, file.buffer);

                // Save thumbnail (300px width)
                await sharp(file.buffer)
                    .resize({ width: 300 })
                    .toFormat('webp')
                    .toFile(thumbnailPath);
            }


            // color-image
            const colorImgFile = files.find(img => img.fieldname.split(',')[0] === varCC);
            const colorImgPath = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`); // directory

            if (colorImgFile) {
                const [colorImgName,] = colorImgFile.fieldname.split(',');
                await fs.mkdir(colorImgPath, { recursive: true });
                
                const filePath = path.join(colorImgPath, `${productID}${colorImgName}.webp`);
                await fs.writeFile(filePath, colorImgFile.buffer);
            }

            modifColorImgs.push(varCC);
        }




        
        // select to view the changes
        const entireObjSql = `
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', p.\`product_id\`, 'name_en', p.\`name_en\`, 'original_price', p.\`original_price\`, 'discount_price', p.\`discount_price\`, 'last_modified', p.\`last_modified\`,
                    'search-tags', (SELECT JSON_ARRAYAGG(tag) FROM PRODUCTS_TAGS AS pst WHERE pst.\`product-id\` = p.\`product_id\`),
                    'attributes', JSON_OBJECT('designer', \`designer\`, 'collection', \`collection\`, 'season', \`season\`, 'category', \`category\`, 'style', \`style\`, 'fabric', \`fabric\`, 'stretch_type', \`stretch_type\`, 'pattern', \`pattern\`, 'fit_type', \`fit_type\`, 'sleeve_length', \`sleeve_length\`, 'sleeve_type', \`sleeve_type\`, 'length', \`length\`, 'hem_shape', \`hem_shape\`, 'neckline', \`neckline\`, 'neck_height', \`neck_height\`, 'waist_line', \`waist_line\`, 'extra', \`extra\`),
                    'vars', (SELECT JSON_OBJECTAGG(pvc.\`color-code\`, JSON_OBJECT(
                        'color-name', (SELECT name FROM PRODUCTS_COLORS WHERE sc = pvc.\`color-code\`),
                        'var-imgs', pvc.\`var-imgs\`,
                        'varSizesQuantity', (SELECT JSON_OBJECTAGG(ps.\`size_code\`, JSON_OBJECT(
                            'is_deleted', ps.\`is_deleted\`,
                            'stock_batches', (SELECT JSON_ARRAYAGG(JSON_OBJECT('batch_id', pb.\`id\`, 'current_available', pb.\`current_available\`, 'total_sales', pb.\`total_sales\`, 'is_active', pb.\`is_active\`)) FROM PRODUCTS_VARIATIONS_STOCK_BATCHES pb  WHERE pb.\`stock_id\` = ps.\`id\`))) FROM PRODUCTS_VARIATIONS_STOCK ps WHERE ps.\`variant_id\` = pvc.\`id\`),
                        'model', (SELECT JSON_OBJECT('model-id', \`model-id\`, 'model-f-name', \`model-f-name\`, 'model-l-name', \`model-l-name\`, 'model-tel-number', \`model-tel-number\`, 'model-height', \`model-height\`, 'model-waist', \`model-waist\`, 'model-bust', \`model-bust\`, 'model-hips', \`model-hips\`, 'model-ig-acc', \`model-ig-acc\`, 'model-pfp', \`model-pfp\`) FROM MODELS WHERE \`model-id\` = pvc.\`var-model\`))) FROM PRODUCTS_VARIATIONS_C as pvc WHERE pvc.\`product-id\` = p.\`product_id\` AND pvc.\`is_deleted\` = FALSE),
                    'sizes', (SELECT JSON_OBJECTAGG(pvs.\`size-code\`, JSON_OBJECT('p-shoulders', \`p-shoulders\`, 'p-length', \`p-length\`, 'p-bust', \`p-bust\`, 'p-waist', \`p-waist\`, 'p-hips', \`p-hips\`, 'ext-p-sleeve-length', \`ext-p-sleeve-length\`, 'ext-p-belt-length', \`ext-p-belt-length\`, 'ext-p-straps-length', \`ext-p-straps-length\`, 'ext-p-cuff', \`ext-p-cuff\`, 'ext-p-bicep-length', \`ext-p-bicep-length\`, 'b-shoulders', \`b-shoulders\`, 'b-bust', \`b-bust\`, 'b-waist', \`b-waist\`, 'b-hips', \`b-hips\`, 'b-height', \`b-height\`)) FROM PRODUCTS_VARIATIONS_S as pvs WHERE pvs.\`product-id\` = p.\`product_id\`))) as result
            FROM PRODUCTS as p
            WHERE p.\`product_id\` = ${productID};
        `;


        const [data] = await connection.query<RowDataPacket[]>(entireObjSql); // Await the result
        console.log(util.inspect(data[0].result, { depth: null, colors: true }));


        const sanitizedChanges = JSON.stringify(productDic);

        const auditSQL = `INSERT INTO AUDIT_LOGS (item_id, item_type_id, change_type, changes, modified_by) VALUES (?, ?, ?, ?, ?);`;

        //  1 : 'Users'
        //  2 : 'Products'
        //  3 : 'Coupons'
        //  4 : 'Models'
        //  5 : 'Purchases'
        //  6 : 'Reviews'

        await connection.query<ResultSetHeader>(auditSQL, [productID, 2, 'create', JSON.stringify(sanitizedChanges), userId]); // Await the result

        // await connection.rollback();
        await connection.commit();

        // commit images uplaod
        await CommitUploadedVarImages(productID, uploadUID, modifVarImgsOrder, files);
        await CommitUploadedColorImages(productID, uploadUID, modifColorImgs, files);

        res.status(200).json(ResponseObj('OK_CREATED', 'success', 'New product was created successfully!'));
        
    } catch (error: unknown) {
        console.log(error);
        // If an error occurs, rollback the transaction
        await connection.rollback();
        
        if (error instanceof Error) res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', error.message));
        else res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred'));
        
    } finally {
        if (uploadUID) await DeleteTempUploadDirectory(uploadUID);
        connection.release();
    }
});

router.put(API_PATHS.PRODUCTS.EDIT_PRODUCT, upload.any(), async (req, res) => {
    // validate session and authentication
    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    const changes: Change[] = JSON.parse(req.body.data);
    const files = req.files as Express.Multer.File[];
    const modifVarImgsOrder: Record<ColorKey, number[]> = req.body.modifVarImgs ? JSON.parse(req.body.modifVarImgs) : {};
    const productID = req.body.pID as number;
    const lastModified = req.body.lastModif as string;
    const force = req.body.force ? req.body.force as boolean : undefined;


    const userId = req.session.user.id;
    const uploadUID = req.body.uuid as string;


    const { productInfoChanges, searchTagsChanges, mergedSizesChanges, mergedVarsChanges, mergedStockChanges, mergedColorsChanges } = ModifiedSections(changes);

    // check all changes fields
    function ModifiedSections(changesArray: Change[]) {
        let productInfoChanges: Change[] = [], searchTagsChanges: Change[] = [], sizesChanges: Change[] = [], variantsChanges: Change[] = [], stockChanges: Change[] = [], colorsChanges: Change[] = [];
        
        const productInfoKeys = new Set(['attributes', 'discount_price', 'original_price', 'name_en', 'name_ar']);

        for (const change of changesArray) {
            const path = change.path;
            const pathParts = path.split('.');
            
            if (pathParts.some(part => productInfoKeys.has(part))) { // for productInfoChanges
                console.log('Detected change: ' + change.path);
                productInfoChanges.push(change);

            } else if (pathParts.includes('search-tags')) { // for searchTagsChanges
                searchTagsChanges.push(change);

            } else if (path.startsWith('sizes.')) { // for sizesChanges
                sizesChanges.push(change);

            } else if (path.startsWith('vars.') && !pathParts.includes('varSizesQuantity') && !pathParts.includes('new_color')) { // for variantsChanges
                variantsChanges.push(change);

                if (change.op === 'add') { // for stockChanges
                    const varName = change.path.split('.').pop();
                    Object.entries((change.val[0] as ColorVariant).varSizesQuantity).map((size) => {
                        stockChanges.push({ op: 'add', path: `vars.${varName}.varSizesQuantity.${size[0]}`, val: [size[1]] });
                    });
                }
            } else if (pathParts.includes('varSizesQuantity')) { // for stockChanges
                stockChanges.push(change);

            } else if (pathParts.includes('new_color')) {
                colorsChanges.push(change);
            } else {
                console.warn('Unrecognized change path:', path);
            }
        }

        Object.keys(modifVarImgsOrder).map((varCC) => {
            variantsChanges.push({ op: 'update', path: `vars.${varCC}.var-imgs`, val: [[], []] });
        });

        return {
            productInfoChanges,
            searchTagsChanges,
            mergedSizesChanges: mergeSizesChanges(sizesChanges),
            mergedVarsChanges: mergeVariantsChanges(variantsChanges),
            mergedStockChanges: mergeStockChanges(stockChanges),
            mergedColorsChanges: mergeColorChanges(colorsChanges)
        };
    }

    function mergeSizesChanges(sizesChanges: Change[]) {
        return sizesChanges.reduce((acc, change) => {
            const path = change.path;
            const pathParts = path.split('.');
            const size = pathParts[1];
            const part = pathParts.pop() as keyof SizeMeasurements;
            const op = change.op;
            const value = change.val.length > 1 ? change.val[1] : change.val[0];

            if (!acc[op]) acc[op] = {};

            // console.log(acc[op][size], value);
            console.log(change);

            if (!acc[op][size] && value !== undefined) {
                console.log('1');
                if (typeof value === 'object' && value !== null) {
                    console.log('here 1? ' + value);
                    acc[op][size] = value;
                }
                else acc[op][size] = { [part as keyof SizeMeasurements]: value };
            } else {
                console.log('2');
                acc[op][size] = { ...acc[op][size], [part as keyof SizeMeasurements]: value };
            }

            // console.log(acc);
            return acc;
        }, {} as Record<ChangeOp, Record<string, Partial<Record<keyof SizeMeasurements, ChangeVal>>>>);
    }

    function mergeVariantsChanges(variantsChanges: Change[]) {
        return variantsChanges.reduce((acc, change) => {
            const varCol = change.path.split('.')[1] as ColorKey;

            if (isOfType<Change>(change, ['path', 'op', 'val'])) {
                if (!acc[varCol]) {
                    // acc[varCol] = [change];
                    acc[varCol] = { changes: [change], var_imgs: modifVarImgsOrder[varCol] ?? [] };
                } else {
                    // acc[varCol] = [...acc[varCol], change];
                    acc[varCol].changes = [...acc[varCol].changes, change];
                }
            }

            // console.log(acc);
            return acc;
        }, {} as Record<ColorKey, { changes: Change[], var_imgs: number[] }>);
    }

    function mergeStockChanges(stockChanges: Change[]) {
        return stockChanges.reduce((acc, change) => {
            const pathParts = change.path.split('.');
            const varCol = pathParts[1];
            const size = pathParts[3];
            const op = change.op;
            const forSizeDelete = !pathParts.some((part: string) => part === 'stock_batches') && pathParts[4] === 'is_deleted';
            const val = change.val.length > 1 ? change.val[1] : change.val[0];
            const value = forSizeDelete ? val as 0 | 1 : (pathParts.length === 4 && op === 'add' ? val as VarSizeStock : val as SizeStockBatch);
            const batchIDFromPath: number = parseInt(pathParts[5]);
            const batchIDFromObj: number | string = (isNaN(batchIDFromPath) && (typeof value !== 'number')) ? (isOfType<VarSizeStock>(value, ['is_deleted', 'stock_batches']) ? '_nb' : (Array.isArray(value) ? value[0].batch_id ?? '_nb' : value.batch_id ?? '_nb')) : batchIDFromPath;
            
            if (!acc[op]) acc[op] = {};
            if (!acc[op][varCol]) acc[op][varCol] = {};
            if (!acc[op][varCol][size]) acc[op][varCol][size] = { is_deleted: undefined, stock_batches: {} };
            
            // If the add is an entire size...
            if (pathParts.length === 4 && op === 'add' && isOfType<VarSizeStock>(value, ['is_deleted', 'stock_batches'])) {
                acc[op][varCol][size] = { is_deleted: value.is_deleted, stock_batches: { [batchIDFromObj]: value.stock_batches[0] } };
                return acc;
            }


            // if it is not a fully new size
            if (forSizeDelete && (value === 0 || value === 1)) {
                acc[op][varCol][size].is_deleted = value;
            } else {
                const batchID = Number.isNaN(batchIDFromPath) || batchIDFromPath === undefined ? batchIDFromObj : batchIDFromPath;
                
                if (pathParts[6]) acc[op][varCol][size].stock_batches[batchID] = { ...acc[op][varCol][size].stock_batches[batchID], [pathParts[6]]: value };
                else acc[op][varCol][size].stock_batches[batchID] = Array.isArray(value) ? value[0] : value;
            }
                    
            // console.log(acc);
            return acc;
        }, {} as Record<ChangeOp, Record<ColorKey, Record<sizeKey, { 'is_deleted': 0 | 1 | undefined; 'stock_batches': Record<number | string, Partial<SizeStockBatch>> }>>>);  // 
    }

    function mergeColorChanges(colorsChanges: Change[]) {
        return colorsChanges.reduce((acc, change) => {
            const value = change.val[1] as newColorType;
            const currColor = change.path.split('.')[1] as ColorKey;
            const newColor = value.sc;

            if (newColor) acc = [...acc, {curr_color: currColor, new_color: newColor}];

            // console.log(acc);
            return acc;
        }, [] as { curr_color: ColorKey; new_color: ColorKey }[]);
    }

    function BuildQueryString() {
        const fields: string[] = [];
        const values: (string | null | number)[] = [];

        for (const { path, val } of productInfoChanges) {

            const pathParts = path.split('.');
            const changeKey = pathParts[pathParts.length - 1];

            fields.push(`${changeKey} = ?`);

            if (val.length > 1) {
                if (val[1] == null) {
                    values.push(null);
                } else if (typeof val[1] === 'string' || typeof val[1] === 'number') {
                    values.push(val[1]);
                }
            } else {
                if (val[0] == null) {
                    values.push(null);
                } else if (typeof val[0] === 'string' || typeof val[0] === 'number') {
                    values.push(val[0]);
                }
            }
        }

        // modified by push
        fields.push(`modified_by = ?`);
        values.push(userId);

        return { fields, values }
    }

    const connection = await db.getConnection();

    try {
        // Check for last_updated to insure no overwrites
        const versionCheckQuery = `SELECT \`last_modified\` FROM PRODUCTS WHERE \`product_id\` = ?`;
        const [result] = await connection.query<RowDataPacket[]>(versionCheckQuery, [productID]);
        
        if (result[0]['last_modified'] && lastModified) {
            console.log('from server: ' + result[0]['last_modified'].toISOString(), 'from req: ' + lastModified);
            if ((result[0]['last_modified'].toISOString() !== lastModified) && !force) {
                res.status(409).json(ResponseObj('ERR_CONFLICT', 'error', 'Version conflict! The product was modified by another user while you were applying changes. Would you like to overwrite and proceed with your applied changes?'));
                return;
            }
        }

        // Start a transaction
        await connection.beginTransaction();

        // for attributes, discount_price, original_price, name_en, name_ar,
        const query1 = BuildQueryString();

        if (query1.fields.length > 0) {
            const sql = `UPDATE PRODUCTS SET ${query1.fields.join(", ")}, last_modified = CURRENT_TIMESTAMP WHERE product_id = ?`;
            query1.values.push(productID);

            console.log(mysql.format(sql, query1.values));
            await connection.query(sql, query1.values);
        }

        // for search-tags
        const delTags: string[] = [];
        const addTags: string[] = [];

        for (const { op, val } of searchTagsChanges) {
            if (op === 'remove') delTags.push(val[0] as string);
            else addTags.push(val[0] as string);
        }

        const delTagsInsertPromises = delTags.map(tag =>
            connection.query("DELETE FROM `PRODUCTS_TAGS` WHERE `product-id` = ? AND `tag` = ?", [productID, tag])
        );

        await Promise.all(delTagsInsertPromises);

        for (const tag of addTags) {
            // check if search word already exists
            const [res] = await connection.query<RowDataPacket[]>('SELECT * FROM `SEARCH_WORDS` WHERE `name` = ?', [tag]);

            if (res.length > 0) {
                // console.log(util.inspect(res, { depth: null, colors: true }));
                await connection.query('INSERT INTO `PRODUCTS_TAGS` (`product-id`, `tag`) VALUES (?, ?)', [productID, tag]);
            } else {
                // add to search  words 
                const [addTagQueryRes] = await connection.query<ResultSetHeader>('INSERT INTO `SEARCH_WORDS` (`name`) VALUES (?)', [tag]);

                if (addTagQueryRes.affectedRows > 0) {
                    // successful... add the word to products-tags
                    await connection.query('INSERT INTO `PRODUCTS_TAGS` (`product-id`, `tag`) VALUES (?, ?)', [productID, tag]);
                }
            }
        }


        // update/add sizes...
        await Promise.all(Object.entries(mergedSizesChanges).flatMap(([operation, entries]) =>
            Object.entries(entries).map(async ([size, updates]) => {
                const fields: string[] = [];
                const values: ChangeVal[] = [];

                console.log(size, updates);

                Object.entries(updates).map(([key, value]) => {
                    fields.push(operation === 'update' ? `\`${key}\` = ?` : `\`${key}\``);
                    values.push(value);
                });

                const sql = operation === 'update' ?
                    `UPDATE PRODUCTS_VARIATIONS_S SET ${fields.join(", ")} WHERE \`product-id\` = ? AND \`size-code\` = ?`
                    :
                    `INSERT INTO PRODUCTS_VARIATIONS_S (\`product-id\`, \`size-code\`, ${fields.join(", ")}) VALUES (?, ?, ${Array(fields.length).fill('?').join(', ')})`;

                if (operation === 'update') values.push(productID, size);
                else values.unshift(productID, size);

                await connection.query(sql, values);
            }
        )));

        // console.log(util.inspect(files, { depth: null, colors: true }));
        // console.log('modifVarImgsOrder: ', modifVarImgsOrder);

        let modifColorImgs: string[] = [];
        let removedVars: string[] = [];


        console.log(util.inspect(mergedVarsChanges, { depth: null, colors: true }));

        await Promise.all(Object.entries(mergedVarsChanges).map(async ([varCC, { changes, var_imgs }]) => {
            let newModelID: number | undefined;
            let varOperation: ChangeOp = 'update';
            let addedVar: ColorVariant | undefined;
            let finalVarImgsCount: number | undefined;

            if (var_imgs.length > 0) {
                const uploadDir = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`, `/${productID}${varCC}`); // temp upload directory
                const VarImgsFiles = files.filter(img => img.fieldname.split('-')[0] === varCC);

                for (const file of VarImgsFiles) {
                    const [, index] = file.fieldname.split('-');
                    await fs.mkdir(uploadDir, { recursive: true });

                    const originalPath = path.join(uploadDir, `${index}.webp`);
                    const thumbnailPath = path.join(uploadDir, `${index}-thumb.webp`);

                    // Save original
                    await fs.writeFile(originalPath, file.buffer);

                    // Save thumbnail (300px width)
                    await sharp(file.buffer)
                        .resize({ width: 300 })
                        .toFormat('webp')
                        .toFile(thumbnailPath);
                }

                finalVarImgsCount = var_imgs.length;
                // console.log('Total valid images: ', finalVarImgsCount);
            }

            if (changes.some((change: Change) => change.op === 'remove')) {
                varOperation = 'remove';
                removedVars.push(varCC);
                // console.log('Var removed: ' + varCC);
            } else if (changes.some((change: Change) => change.op === 'add')) {
                varOperation = 'add';
                addedVar = changes[0].val[0] as ColorVariant;
            } else {
                varOperation = 'update';
            }

            // color-image
            if (changes.some((change: Change) => change.path.includes('color-img') || (change.path.includes(`vars.${varCC}`) && change.op === 'add'))) {
                const colorImgFile = files.find(img => img.fieldname.split(',')[0] === varCC);
                const colorImgPath = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`); // directory

                if (colorImgFile) {
                    const [colorImgName,] = colorImgFile.fieldname.split(',');
                    await fs.mkdir(colorImgPath, { recursive: true });
                    
                    const filePath = path.join(colorImgPath, `${productID}${colorImgName}.webp`);
                    await fs.writeFile(filePath, colorImgFile.buffer);
                }

                modifColorImgs.push(varCC);
            }

            // model
            const modelChange = changes.find(change => change.path.includes('model-id'));
            if (modelChange) {
                newModelID = modelChange.val[1] as number;
            } else if (varOperation === 'add' && addedVar) {
                newModelID = addedVar.model['model-id'];
            }

            // PRODUCTS_VARIATIONS_C query and execute
            let sql: string = '';
            let values: (string | number | boolean)[] = [];

            switch (varOperation) {
                case 'update':
                    sql = `UPDATE PRODUCTS_VARIATIONS_C SET ${modelChange ? '`var-model` = ?' : ''}${modelChange && finalVarImgsCount ? ',' : ''} ${finalVarImgsCount ? '`var-imgs` = ?' : ''} WHERE \`product-id\` = ? AND \`color-code\` = ? AND \`is_deleted\` = ?`;
                    values = [productID, varCC, false];
                    if (finalVarImgsCount) values.unshift(finalVarImgsCount);
                    if (modelChange && newModelID) values.unshift(newModelID);
                break;

                case 'add':
                    // check if color already exists...
                    const selectQuery = `SELECT * FROM PRODUCTS_VARIATIONS_C WHERE \`product-id\` = ? AND \`color-code\` = ? AND is_deleted = ?`
                    const selectValues = [productID, varCC, false];

                    console.log(mysql.format(selectQuery, selectValues));
                    const [selectRes] = await connection.query<RowDataPacket[]>(selectQuery, selectValues);

                    if (selectRes.length > 0) {
                        res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', `The variant color ${varCC} already exits in the database!`));
                        return;
                    } else {
                        sql = `INSERT INTO PRODUCTS_VARIATIONS_C (\`product-id\`, \`color-code\`, \`var-imgs\`, \`var-model\`, \`is_deleted\`) VALUES (?, ?, ?, ?, ?)`;
                        if (newModelID && finalVarImgsCount) values = [productID, varCC, finalVarImgsCount, newModelID, false];
                    }
                break;

                case 'remove':
                    sql = `UPDATE PRODUCTS_VARIATIONS_C SET is_deleted = ? WHERE \`product-id\` = ? AND \`color-code\` = ? AND \`is_deleted\` = ?`;
                    values = [true, productID, varCC, false];
                break;
            
                default:
                break;
            }

            console.log(mysql.format(sql, values));
            await connection.query(sql, values);
        }));




        // product variation stock... product-id  color-code  size-code  current-available  total-sales  total-stock
        console.log(util.inspect(mergedStockChanges, { depth: null, colors: true }));

        for (const [operation, modifiedVars] of Object.entries(mergedStockChanges)) {
            for (const [varCC, modifiedSize] of Object.entries(modifiedVars)) {
                // Get variant_id
                const variantIdSelectQuery = `SELECT \`id\` FROM PRODUCTS_VARIATIONS_C WHERE \`product-id\` = ? AND \`color-code\` = ? AND \`is_deleted\` = ?`;
                const [varIDRes] = await connection.query<RowDataPacket[]>(variantIdSelectQuery, [productID, varCC, false]);

                const variantID = varIDRes[0]['id'];

                for (const [sizeName, { is_deleted, stock_batches }] of Object.entries(modifiedSize)) {
                    let sql;
                    let stockID;

                    // Apply is_deleted change to stock table if it exists...
                    if (is_deleted === 1 || is_deleted === 0) {
                        const stockRemoveQuery = `UPDATE PRODUCTS_VARIATIONS_STOCK SET \`is_deleted\` = ? WHERE \`variant_id\` = ? AND \`size_code\` = ?`;
                        console.log(mysql.format(stockRemoveQuery, [is_deleted === 1 ? true : false, variantID, sizeName]));
                        await connection.query<ResultSetHeader>(stockRemoveQuery, [is_deleted === 1 ? true : false, variantID, sizeName]);
                    }

                    // Find the stock_id based on the variant_id and sizeName... if it doesn't exist, add it
                    const stockIdSelectQuery = `SELECT \`id\`, \`is_deleted\` FROM PRODUCTS_VARIATIONS_STOCK WHERE \`variant_id\` = ? AND \`size_code\` = ?`; //  AND \`is_deleted\` = ?
                    const [stockIDRes] = await connection.query<RowDataPacket[]>(stockIdSelectQuery, [variantID, sizeName]);


                    if (stockIDRes.length < 1) { // entry doesn't exist, create a new stock entry
                        const stockInsertQuery = `INSERT INTO PRODUCTS_VARIATIONS_STOCK (\`variant_id\`, \`size_code\`) VALUES (?, ?)`;
                        const [stockInsertRes] = await connection.query<ResultSetHeader>(stockInsertQuery, [variantID, sizeName]);

                        if (stockInsertRes.affectedRows > 0) { // Insert successful
                            stockID = stockInsertRes.insertId;
                        }
                    } else {
                        stockID = stockIDRes[0]['id'];
                    }
                    

                    // Apply changes to each batch of the size
                    for (const [currBatchID, currBatch] of Object.entries(stock_batches)) {
                        const fields = [];
                        const values = [];

                        for (const [key, value] of Object.entries(currBatch)) {
                            if (operation === 'remove') continue;

                            console.log(varCC, sizeName, currBatchID, key, value);

                            fields.push(operation === 'update' ? `\`${key}\` = ?` : `\`${key}\``);
                            values.push(value);
                        }

                        switch (operation) {
                            case 'update':
                                sql = `UPDATE PRODUCTS_VARIATIONS_STOCK_BATCHES SET ${fields.join(', ')} WHERE \`id\` = ?`;
                                values.push(currBatchID);
                                break;

                            case 'add':
                                sql = `INSERT INTO PRODUCTS_VARIATIONS_STOCK_BATCHES (\`stock_id\`, ${fields.join(", ")}) VALUES (?, ${Array(fields.length).fill('?').join(', ')})`;
                                values.unshift(stockID);
                                break;

                            default:
                                sql = '';
                                break;
                        }

                        console.log(mysql.format(sql ?? '', values));
                        console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------')
                        await connection.query(sql, values);
                    }
                }
            }
        };



        // apply color change
        for (const { curr_color, new_color } of mergedColorsChanges) {
            const sql = `UPDATE PRODUCTS_VARIATIONS_C SET \`color-code\` = ? WHERE \`product-id\` = ? AND \`color-code\` = ? AND \`is_deleted\` = ?`;
            const values = [new_color, productID, curr_color, false];

            console.log(mysql.format(sql, values));
            await connection.query(sql, values);
        }



        // select to view the changes
        const entireObjSql = `
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', p.\`product_id\`, 'name_en', p.\`name_en\`, 'original_price', p.\`original_price\`, 'discount_price', p.\`discount_price\`, 'last_modified', p.\`last_modified\`,
                    'search-tags', (SELECT JSON_ARRAYAGG(tag) FROM PRODUCTS_TAGS AS pst WHERE pst.\`product-id\` = p.\`product_id\`),
                    'attributes', JSON_OBJECT('designer', \`designer\`, 'collection', \`collection\`, 'season', \`season\`, 'category', \`category\`, 'style', \`style\`, 'fabric', \`fabric\`, 'stretch_type', \`stretch_type\`, 'pattern', \`pattern\`, 'fit_type', \`fit_type\`, 'sleeve_length', \`sleeve_length\`, 'sleeve_type', \`sleeve_type\`, 'length', \`length\`, 'hem_shape', \`hem_shape\`, 'neckline', \`neckline\`, 'neck_height', \`neck_height\`, 'waist_line', \`waist_line\`, 'extra', \`extra\`),
                    'vars', (SELECT JSON_OBJECTAGG(pvc.\`color-code\`, JSON_OBJECT(
                        'color-name', (SELECT name FROM PRODUCTS_COLORS WHERE sc = pvc.\`color-code\`),
                        'var-imgs', pvc.\`var-imgs\`,
                        'varSizesQuantity', (SELECT JSON_OBJECTAGG(ps.\`size_code\`, JSON_OBJECT(
                            'is_deleted', ps.\`is_deleted\`,
                            'stock_batches', (SELECT JSON_ARRAYAGG(JSON_OBJECT('batch_id', pb.\`id\`, 'current_available', pb.\`current_available\`, 'total_sales', pb.\`total_sales\`, 'is_active', pb.\`is_active\`)) FROM PRODUCTS_VARIATIONS_STOCK_BATCHES pb  WHERE pb.\`stock_id\` = ps.\`id\`))) FROM PRODUCTS_VARIATIONS_STOCK ps WHERE ps.\`variant_id\` = pvc.\`id\`),
                        'model', (SELECT JSON_OBJECT('model-id', \`model-id\`, 'model-f-name', \`model-f-name\`, 'model-l-name', \`model-l-name\`, 'model-tel-number', \`model-tel-number\`, 'model-height', \`model-height\`, 'model-waist', \`model-waist\`, 'model-bust', \`model-bust\`, 'model-hips', \`model-hips\`, 'model-ig-acc', \`model-ig-acc\`, 'model-pfp', \`model-pfp\`) FROM MODELS WHERE \`model-id\` = pvc.\`var-model\`))) FROM PRODUCTS_VARIATIONS_C as pvc WHERE pvc.\`product-id\` = p.\`product_id\` AND pvc.\`is_deleted\` = FALSE),
                    'sizes', (SELECT JSON_OBJECTAGG(pvs.\`size-code\`, JSON_OBJECT('p-shoulders', \`p-shoulders\`, 'p-length', \`p-length\`, 'p-bust', \`p-bust\`, 'p-waist', \`p-waist\`, 'p-hips', \`p-hips\`, 'ext-p-sleeve-length', \`ext-p-sleeve-length\`, 'ext-p-belt-length', \`ext-p-belt-length\`, 'ext-p-straps-length', \`ext-p-straps-length\`, 'ext-p-cuff', \`ext-p-cuff\`, 'ext-p-bicep-length', \`ext-p-bicep-length\`, 'b-shoulders', \`b-shoulders\`, 'b-bust', \`b-bust\`, 'b-waist', \`b-waist\`, 'b-hips', \`b-hips\`, 'b-height', \`b-height\`)) FROM PRODUCTS_VARIATIONS_S as pvs WHERE pvs.\`product-id\` = p.\`product_id\`))) as result
            FROM PRODUCTS as p
            WHERE p.\`product_id\` = ${productID};
        `;


        const [data] = await connection.query<RowDataPacket[]>(entireObjSql); // Await the result
        // console.log(data[0].result);
        console.log(util.inspect(data[0].result, { depth: null, colors: true }));

        // console.log(data[0].result[0].sizes.XS);
        // console.log(data[0].result[0].sizes.S);
        // console.log(data[0].result[0].sizes.XXL);

        // console.log(data[0].result[0].vars.BLK.varSizesQuantity);
        // console.log(data[0].result[0].vars.BLU.varSizesQuantity);
        // console.log(data[0].result[0].vars.PNK.varSizesQuantity);
        // console.log(data[0].result[0].vars.RED.varSizesQuantity);






        const sanitizedChanges = sanitizeChangesForAudit(changes);

        const auditSQL = `INSERT INTO AUDIT_LOGS (item_id, item_type_id, change_type, changes, modified_by, forced) VALUES (?, ?, ?, ?, ?, ?);`;


        //  1 : 'Users'
        //  2 : 'Products'
        //  3 : 'Coupons'
        //  4 : 'Models'
        //  5 : 'Purchases'
        //  6 : 'Reviews'

        const [addChangeLog] = await connection.query<ResultSetHeader>(auditSQL, [productID, 2, 'update', JSON.stringify(sanitizedChanges), userId, force ? true : false]); // Await the result
        console.log(util.inspect(addChangeLog, { depth: null, colors: true }));

        // commit images uplaod
        await CommitUploadedVarImages(productID, uploadUID, modifVarImgsOrder, files);
        await CommitUploadedColorImages(productID, uploadUID, modifColorImgs, files);
        await CommitDeleteRemovedVarsImages(productID, removedVars);
        if (mergedColorsChanges.length > 0) await RenameImagesForColorChange(productID, mergedColorsChanges);

        // await connection.rollback();
        await connection.commit();


        res.status(200).json(ResponseObj('OK_UPDATED', 'success', 'Product info updated successfully!'));
        
        
    } catch (error: unknown) {
        console.log(error);
        // If an error occurs, rollback the transaction
        await connection.rollback();

        
        if (error instanceof Error) res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', error.message));
        else res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred'));
        
    } finally {
        if (uploadUID) await DeleteTempUploadDirectory(uploadUID);
        connection.release();
    }
});

router.put(API_PATHS.PRODUCTS.TOGGLE_PRODUCT, async (req, res) => {
    console.log('Toggle product route...', req.body);

    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    const isValid = validateParams(req.body, {
        pID: /^[0-9]+$/,
        isDeleted: /^(0|1)$/
    });

    if (!isValid) {
        res.status(400).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred')); // { message: 'Invalid query parameters/values' }
        return;
    }

    const productID = req.body.pID as number;
    const isDeleted = req.body.isDeleted as boolean;
    const userId = req.session.user.id;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const sqlQuery = `UPDATE PRODUCTS SET \`is_deleted\` = ?, \`modified_by\` = ?, \`last_modified\` = CURRENT_TIMESTAMP WHERE \`product_id\` = ?`;

        console.log(mysql.format(sqlQuery, [isDeleted, userId, productID]));
        await connection.query(sqlQuery, [isDeleted, userId, productID]);


        const changes: Change[] = [{ path: 'is_deleted', op: 'update', val: isDeleted ? [0, 1] : [1, 0] }];
        const sanitizedChanges = sanitizeChangesForAudit(changes);

        const auditSQL = `INSERT INTO AUDIT_LOGS (item_id, item_type_id, change_type, changes, modified_by) VALUES (?, ?, ?, ?, ?);`;


        //   1: 'Users'    2: 'Products'    3: 'Coupons'    4: 'Models'    5: 'Purchases'    6: 'Reviews'
        await connection.query<ResultSetHeader>(auditSQL, [productID, 2, 'update', JSON.stringify(sanitizedChanges), userId]); // Await the result
        

        // all operations successful... commit changes
        await connection.commit();

        res.status(200).json(ResponseObj('OK_UPDATED', 'success', `Product ${productID} is now ${isDeleted ? 'hidden' : 'visibile'}!`));
    } catch (error: unknown) {
        console.log(error);
        // If an error occurs, rollback the transaction
        await connection.rollback();
        
        if (error instanceof Error) res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', error.message));
        else res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred'));
        
    } finally {
        connection.release();
    }
});

router.get(API_PATHS.PRODUCTS.SEARCH, async (req, res) => {
    const words = req.query.words as (string | number)[];
    const limit = 12; // parseInt(req.query.limit as string);
    const page = parseInt(req.query.page as string);
    let searchWords: (string | number)[] | undefined = undefined;
    let sql: string;

    if (Array.isArray(words)) {
        searchWords = words;
    } else if (typeof words === 'string' || typeof words === 'number') {
        searchWords = [words];
    }

    // console.log(req.query);
    // console.log('Search Words: ', searchWords);

    const connection = await db.getConnection();

    if (!searchWords || searchWords.length < 1) {
        const isValid = validateParams(req.query, {
            page: /^[0-9]+$/
        });

        if (!isValid) {
            res.status(400).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred')); // { message: 'Invalid query parameters/values' }
            return;
        }

        try {
            const sql = `
                WITH limitproducts AS (SELECT \`product_id\`, \`name_en\`, \`original_price\`, \`discount_price\`, \`is_deleted\` FROM PRODUCTS LIMIT ? OFFSET ?)
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT('id', p.\`product_id\`,'name_en', p.\`name_en\`,'original_price', p.\`original_price\`,'discount_price', p.\`discount_price\`, 'is_deleted', p.\`is_deleted\`,
                    'vars', (SELECT JSON_OBJECTAGG(pvc.\`color-code\`, JSON_OBJECT(
                        'var-imgs', pvc.\`var-imgs\`))
                    FROM PRODUCTS_VARIATIONS_C pvc WHERE pvc.\`product-id\` = p.\`product_id\` AND pvc.is_deleted = FALSE),
                    'sizes', (SELECT JSON_ARRAYAGG(pvs.\`size-code\`) FROM PRODUCTS_VARIATIONS_S pvs WHERE pvs.\`product-id\` = p.\`product_id\`))
                ) AS result FROM limitproducts p;
            `;

            const offset = (limit * page) - limit;
            const [results] = await connection.query<ResultsTypes[]>(sql, [limit, offset]);
            res.json(results[0].result);
        } catch (err) {
            console.log(err); // Handle the error
            res.status(500).send('Internal Server Error'); // Send an error response
        } finally {
            connection.release();
        }
    } else {
        const isValid = validateParams(req.query, {
            words: /^[a-zA-Z0-9]+$/,
            page: /^[0-9]+$/
        });
        
        if (!isValid) {
            res.status(400).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred'));
            return;
        }
        
        try {
            const likeClauses = searchWords.map(() => `SW.name LIKE ?`).join(' OR ');
            const likeValues: (string | number)[] = searchWords.map(word => `${word}%`);
            const requiredCount = searchWords.length;

            sql = `
                WITH

                compareproducts AS (
                    SELECT P.*, COUNT(*) as match_count
                    FROM PRODUCTS P
                    JOIN PRODUCTS_TAGS PT ON P.\`product_id\` = PT.\`product-id\`
                    JOIN SEARCH_WORDS SW ON PT.\`tag\` = SW.\`name\`
                    WHERE ${likeClauses}
                    GROUP BY P.\`product_id\`
                    HAVING COUNT(DISTINCT SW.\`name\`) = ${requiredCount}
                    LIMIT ? OFFSET ?
                ),

                comparevars AS (
                    SELECT 
                        pvc.\`product-id\`, 
                        pvc.\`color-code\`, 
                        MAX(pc.\`name\`) AS \`name\`,  
                        MAX(pvc.\`var-imgs\`) AS \`var-imgs\`
                    FROM PRODUCTS_VARIATIONS_C pvc
                    JOIN PRODUCTS_COLORS pc ON pvc.\`color-code\` = pc.\`sc\`
                    WHERE pvc.\`is_deleted\` = FALSE
                    GROUP BY pvc.\`product-id\`, pvc.\`color-code\`
                )

                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', cp.\`product_id\`, 
                        'name_en', cp.\`name_en\`, 
                        'original_price', cp.\`original_price\`, 
                        'discount_price', cp.\`discount_price\`,
                        'is_deleted', cp.\`is_deleted\`, 
                        'vars', (
                            SELECT JSON_OBJECTAGG(
                                cv.\`color-code\`, JSON_OBJECT(
                                    'var-imgs', cv.\`var-imgs\`,
                                    'name', cv.\`name\`
                                )
                            ) 
                            FROM comparevars cv 
                            WHERE cv.\`product-id\` = cp.\`product_id\`
                        ),
                        'sizes', (
                            SELECT JSON_ARRAYAGG(pvs.\`size-code\`) 
                            FROM PRODUCTS_VARIATIONS_S pvs 
                            WHERE pvs.\`product-id\` = cp.\`product_id\`
                        )
                    )
                ) AS result 
                FROM compareproducts cp;
            `;

            const offset = (limit * page) - limit;
            const values = likeValues.concat([limit, offset]);

            console.log(mysql.format(sql, values));
            const [results] = await connection.query<ResultsTypes[]>(sql, values);
            res.json(results[0].result);
        } catch (err) {
            console.log(err); // Handle the error
            res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'Internal Server Error'));
        } finally {
            connection.release();
        }
    }
});

router.get(API_PATHS.PRODUCTS.GET_PRODUCT, async (req, res) => {
    // console.log(req.query);
    const isValid = validateParams(req.query, {
        id: /^[0-9]+$/
    });

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    const productId = req.query.id as string;

    const sql = `
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', p.\`product_id\`, 'name_en', p.\`name_en\`, 'original_price', p.\`original_price\`, 'discount_price', p.\`discount_price\`, 'last_modified', p.\`last_modified\`,
                'search-tags', (SELECT JSON_ARRAYAGG(tag) FROM PRODUCTS_TAGS AS pst WHERE pst.\`product-id\` = p.\`product_id\`),
                'attributes', JSON_OBJECT('designer', \`designer\`, 'collection', \`collection\`, 'season', \`season\`, 'category', \`category\`, 'style', \`style\`, 'fabric', \`fabric\`, 'stretch_type', \`stretch_type\`, 'pattern', \`pattern\`, 'fit_type', \`fit_type\`, 'sleeve_length', \`sleeve_length\`, 'sleeve_type', \`sleeve_type\`, 'length', \`length\`, 'hem_shape', \`hem_shape\`, 'neckline', \`neckline\`, 'neck_height', \`neck_height\`, 'waist_line', \`waist_line\`, 'extra', \`extra\`),
                'vars', (SELECT JSON_OBJECTAGG(pvc.\`color-code\`, JSON_OBJECT(
                    'color-name', (SELECT name FROM PRODUCTS_COLORS WHERE sc = pvc.\`color-code\`),
                    'var-imgs', pvc.\`var-imgs\`,
                    'varSizesQuantity', (SELECT JSON_OBJECTAGG(ps.\`size_code\`, JSON_OBJECT(
                        'is_deleted', ps.\`is_deleted\`,
                        'stock_batches', (SELECT JSON_ARRAYAGG(JSON_OBJECT('batch_id', pb.\`id\`, 'current_available', pb.\`current_available\`, 'total_sales', pb.\`total_sales\`, 'is_active', pb.\`is_active\`)) FROM PRODUCTS_VARIATIONS_STOCK_BATCHES pb  WHERE pb.\`stock_id\` = ps.\`id\`))) FROM PRODUCTS_VARIATIONS_STOCK ps WHERE ps.\`variant_id\` = pvc.\`id\`),
                    'model', (SELECT JSON_OBJECT('model-id', \`model-id\`, 'model-f-name', \`model-f-name\`, 'model-l-name', \`model-l-name\`, 'model-tel-number', \`model-tel-number\`, 'model-height', \`model-height\`, 'model-waist', \`model-waist\`, 'model-bust', \`model-bust\`, 'model-hips', \`model-hips\`, 'model-ig-acc', \`model-ig-acc\`, 'model-pfp', \`model-pfp\`) FROM MODELS WHERE \`model-id\` = pvc.\`var-model\`))) FROM PRODUCTS_VARIATIONS_C as pvc WHERE pvc.\`product-id\` = p.\`product_id\` AND pvc.\`is_deleted\` = FALSE),
                'sizes', (SELECT JSON_OBJECTAGG(pvs.\`size-code\`, JSON_OBJECT('p-shoulders', \`p-shoulders\`, 'p-length', \`p-length\`, 'p-bust', \`p-bust\`, 'p-waist', \`p-waist\`, 'p-hips', \`p-hips\`, 'ext-p-sleeve-length', \`ext-p-sleeve-length\`, 'ext-p-belt-length', \`ext-p-belt-length\`, 'ext-p-straps-length', \`ext-p-straps-length\`, 'ext-p-cuff', \`ext-p-cuff\`, 'ext-p-bicep-length', \`ext-p-bicep-length\`, 'b-shoulders', \`b-shoulders\`, 'b-bust', \`b-bust\`, 'b-waist', \`b-waist\`, 'b-hips', \`b-hips\`, 'b-height', \`b-height\`)) FROM PRODUCTS_VARIATIONS_S as pvs WHERE pvs.\`product-id\` = p.\`product_id\`))) as result
        FROM PRODUCTS as p
        WHERE p.\`product_id\` = ?;
    `;

    const connection = await db.getConnection();

    try {
        const [results] = await connection.query<ResultsTypes[]>(sql, [productId]);
        res.json(results[0].result);
    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).send('Internal Server Error'); // Send an error response
    } finally {
        connection.release();
    }
});

router.get(API_PATHS.PRODUCTS.GET_OPTIONS, async (req, res) => {
    // console.log(req.query);
    const isValid = validateParams(req.query, {
        for: /^[a-zA-Z ]+$/
    });

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    const selectFor = attrTables[req.query.for as attrTableKey];

    const sql = `SELECT * FROM \`${selectFor}\``;

    const connection = await db.getConnection();

    try {
        const [results] = await connection.query<ResultsTypes[]>(sql);
        console.log(results);
        res.json(results);
    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).send('Internal Server Error'); // Send an error response
    } finally {
        connection.release();
    }
});

router.post(API_PATHS.PRODUCTS.ADD_OPTIONS, async (req, res) => {
    if (!req.session.user) {
        res.status(401).json(ResponseObj('ERR_UNAUTHORIZED', 'error', 'Unauthorized request! Please contact an admin with the required permissions'));
        return;
    }

    // console.log(req.body);
    
    const isValid = validateParams(req.body, {
        for: /^[a-zA-Z ]+$/,
        name: /^[a-zA-Z ]+$/,
        sc: { pattern: /^[a-zA-Z]+$/, optional: true }
    });
    
    if (!isValid) {
        res.status(400).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred')); // { message: 'Invalid query parameters/values' }
        return;
    }

    const targetTable = req.body.for as attrTableKey;
    const forColor = targetTable === 'color' ? true : false;
    const name = req.body.name as string;
    const sc = req.body.sc as string;

    

    const connection = await db.getConnection();

    try {
        const sqlQuery = (forColor ?
            `INSERT INTO ${'`PRODUCTS_COLORS`'} (name, sc) VALUES (?, ?)`
            :
            `INSERT INTO ${attrTables[targetTable]} (name) VALUES (?)`
        );

        await connection.query(sqlQuery, (forColor ? [name, sc] : [name]));

        res.status(200).json(ResponseObj('OK_CREATED', 'success', `${forColor ? 'Color' : 'Attribute'} option was added successfully!`));
        
    } catch (error: unknown) {
        console.log(error);
        
        if (error instanceof Error) res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', error.message));
        else res.status(500).json(ResponseObj('ERR_INTERNAL', 'error', 'An unknown error occurred'));
        
    } finally {
        connection.release();
    }
});

router.get(API_PATHS.PRODUCTS.GET_FREQUENT_TAGS, async (req, res) => {
    // console.log(req.query);
    const isValid = validateParams(req.query, {});

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    const sql = 'SELECT `tag`, COUNT(*) AS tag_count FROM `PRODUCTS_TAGS` GROUP BY `tag` ORDER BY tag_count DESC LIMIT 10';

    const connection = await db.getConnection();

    try {
        const [results] = await connection.query<ResultsTypes[]>(sql);
        console.log(results);
        res.json(results);
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    } finally {
        connection.release();
    }
});

router.get(API_PATHS.PRODUCTS.GET_SEARCH_TAGS, async (req, res) => {
    // console.log(req.query);
    const isValid = validateParams(req.query, {
        word: /^[a-zA-Z0-9]+$/
    });

    if (!isValid) {
        res.status(400).json({ message: 'Invalid query parameters/values' });
        return;
    }

    const word = req.query.word as (string);

    const sql = 'SELECT * FROM `SEARCH_WORDS` WHERE `name` LIKE ? ORDER BY INSTR(`name`, ?) ASC, LENGTH(`name`) ASC';

    const connection = await db.getConnection();

    try {
        const [results] = await connection.query<ResultsTypes[]>(sql, [`%${word}%`, word]);
        console.log(results);
        res.json(results);
    } catch (err) {
        console.log(err); // Handle the error
        res.status(500).send('Internal Server Error'); // Send an error response
    } finally {
        connection.release();
    }
});

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async function RenameWithTempPrefix(dirPath: string) {
    console.warn(dirPath);
    try {
        const files = await fs.readdir(dirPath);
        const webpFiles = files.filter(f => f.endsWith('.webp') && !f.startsWith('__TEMP__'));
    
        const renameOps = webpFiles.map(async (file) => {
            const oldPath = path.join(dirPath, file);
            const newPath = path.join(dirPath, `__TEMP__${file}`);
            await fs.rename(oldPath, newPath);
        });
    
        await Promise.all(renameOps);
        console.log('Step 1: Temp-renaming done.');
    } catch (err) {
        if (isErrnoException(err) && err.code === 'ENOENT') {
            console.log(`Skipping missing directory: ${dirPath}`);
            return;
        }
        throw err; // rethrow all other errors
    }
}

async function ApplyNewOrder(order: number[], dirPath: string) {
    const renameOps = order.map(async (originalIndex, newIndex) => {
        if (originalIndex !== -1) { // -1 for newly uploaded images (should be handled separately)
            const tempName = `__TEMP__${originalIndex}.webp`;
            const tempPath = path.join(dirPath, tempName);
            const tempThumbName = `__TEMP__${originalIndex}-thumb.webp`;
            const tempThumbPath = path.join(dirPath, tempThumbName);

            const newName = `${newIndex}.webp`;
            const newPath = path.join(dirPath, newName);
            const newThumbName = `${newIndex}-thumb.webp`;
            const newThumbPath = path.join(dirPath, newThumbName);

            try {
                await fs.rename(tempPath, newPath);
                await fs.rename(tempThumbPath, newThumbPath);
                console.log('Step 2: Renamed based on new order.');
            } catch (err: unknown) {
                if (err instanceof Error) console.error(`Failed to rename ${tempName} → ${newName}:`, err.message);
            }
        }
    });

    await Promise.all(renameOps);
}

async function SaveUploadedImages(dirPath: string, uploadDir: string, files: Express.Multer.File[], colorImgName: string | undefined = undefined) {
    for (const file of files) {
        console.log(file.fieldname);
        const [, index] = file.fieldname.split(colorImgName ? ',' : '-');
        await fs.mkdir(dirPath, { recursive: true });

        const tempFile = path.join(uploadDir, colorImgName ? `${colorImgName}.webp` : `${index}.webp`);
        const filePath = path.join(dirPath, colorImgName ? `${colorImgName}.webp` : `${index}.webp`);

        const tempThumbFile = path.join(uploadDir, `${index}-thumb.webp`);
        const thumbFilePath = path.join(dirPath, `${index}-thumb.webp`);
        
        try {
            await fs.rename(tempFile, filePath);
            if (!colorImgName) await fs.rename(tempThumbFile, thumbFilePath);
            console.log('Step 3: Saved new images to the product directory');
        } catch (err: unknown) {
            if (err instanceof Error) console.error(`Failed to move ${tempFile} → ${filePath}:`, err.message);
        }
    }
}

async function DeleteLeftoverTempImages(dirPath: string) {
    try {
        const files = await fs.readdir(dirPath);
        const leftovers = files.filter(f => f.startsWith('__TEMP__') && f.endsWith('.webp'));

        const deleteOps = leftovers.map(file =>
            fs.unlink(path.join(dirPath, file)).catch(err => {
                console.error(`Failed to delete ${file}:`, err.message);
            })
        );

        await Promise.all(deleteOps);
        console.log('Step 4: Leftover temp files deleted.');
    } catch (err) {
        if (isErrnoException(err) && err.code === 'ENOENT') {
            console.log(`${dirPath} doesn't exist.`);
        }
        throw err;
    }
}

async function DeleteTempUploadDirectory(uploadUID: string) {
    const uploadDir = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`); // temp upload directory

    try {
        await fs.rm(uploadDir, { recursive: true, force: true });
        console.log('Step 5: Temp upload folder deleted.');
    } catch (err: unknown) {
        if (err instanceof Error) console.error(`Failed to delete temp folder`, err.message);
    }
}

async function ProcessImages(productID: number, uploadUID: string, varName: string, newOrder: number[], uplaodedFiles: Express.Multer.File[]) {
    const dirPath = path.join(__dirname, '../../../server/public/products', `/${productID}`, `/${productID}${varName}`); // directory
    const uploadDir = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`, `/${productID}${varName}`); // temp upload directory
    
    try {
        await RenameWithTempPrefix(dirPath);
        await ApplyNewOrder(newOrder, dirPath);
        await SaveUploadedImages(dirPath, uploadDir, uplaodedFiles);
        await DeleteLeftoverTempImages(dirPath);
        console.log('✅ All done!');
    } catch (err) {
        console.error('❌ Error during processing:', err);
    }
}

async function CommitUploadedVarImages(productID: number, uploadUID: string, modifVarImgsOrder: Record<string, number[]>, uplaodedFiles: Express.Multer.File[]) {
    // var-imgs
    await Promise.all(Object.entries(modifVarImgsOrder).map(async ([varCC, newOrder]) => {
        const VarImgsFiles = uplaodedFiles.filter(img => img.fieldname.split('-')[0] === varCC);

        await ProcessImages(productID, uploadUID, varCC, newOrder, VarImgsFiles);
    }));
}

async function CommitUploadedColorImages(productID: number, uploadUID: string, modifColorImgs: string[], uploadedFiles: Express.Multer.File[]) {
    await Promise.all(modifColorImgs.map(async (varCC) => {
        console.warn(varCC);

        const colorImgFile = uploadedFiles.filter(img => img.fieldname.split(',')[0] === varCC);
        const colorImgPath = path.join(__dirname, '../../../server/public/products', `/${productID}`); // directory
        const uploadDir = path.join(__dirname, '../../../server/public/temp', `/${uploadUID}`); // temp upload directory

        await SaveUploadedImages(colorImgPath, uploadDir, colorImgFile, `${productID}${varCC}`);
    }));
}

async function CommitDeleteRemovedVarsImages(productID: number, removedVars: string[]) {
    await Promise.all(removedVars.map(async (varCC) => {
        const varImgsDir = path.join(__dirname, '../../../server/public/products', `/${productID}`, `/${productID}${varCC}`);
        const colorImgPath = path.join(__dirname, '../../../server/public/products', `/${productID}`, `/${productID}${varCC}.webp`);

        try {
            await fs.rm(varImgsDir, { recursive: true, force: true });
            await fs.unlink(colorImgPath);
            console.log(`Removed variant ${varCC} images folder and color image were successfully deleted.`);
        } catch (err: unknown) {
            if (err instanceof Error) console.error(`Failed to delete temp folder`, err.message);
        }
    }));
}

async function RenameImagesForColorChange(productID: number, mergedColorsChanges: { curr_color: string; new_color: string; }[]) {
    for (const { curr_color, new_color } of mergedColorsChanges) {
        const dirPath = path.join(__dirname, '../../../server/public/products', `/${productID}`); // directory

        try {
            const files = await fs.readdir(dirPath);
            const webpFiles = files.filter(f => f.startsWith(`${productID}${curr_color}`));
            console.log(webpFiles);
        
            const renameOps = webpFiles.map(async (file) => {
                const oldPath = path.join(dirPath, `${productID}${curr_color}${file.endsWith('.webp') ? '.webp' : ''}`);
                const newPath = path.join(dirPath, `${productID}${new_color}${file.endsWith('.webp') ? '.webp' : ''}`);
                await fs.rename(oldPath, newPath);
            });
        
            await Promise.all(renameOps);
            console.log('Step 1: Temp-renaming done.');
        } catch (err) {
            if (isErrnoException(err) && err.code === 'ENOENT') {
                console.log(`Skipping missing directory: ${dirPath}`);
                return;
            }
            throw err; // rethrow all other errors
        }
    }
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function ResponseObj(code: ServerResponseCodes, type: ServerResponseTypes, message: string): ServerApiResponse {
    return { code, type, message }
}

// function validateChanges(changes: Change[], allowedFields: string[]) {
//     const errors: string[] = [];

//     for (const change of changes) {
//         if (!change.path || !change.op || !("val" in change)) {
//             errors.push(`Invalid change object: ${JSON.stringify(change)}`);
//             continue;
//         }

//         const segments = change.path.split(".");
//         const lastKey = segments[segments.length - 1];

//         if (!allowedFields.includes(lastKey)) {
//             errors.push(`Unauthorized change to field: "${lastKey}" in path "${change.path}"`);
//         }

//         // Optional: type checks (example: price fields should be numbers)
//         if (["original_price", "discount_price"].includes(lastKey)) {
//             if (typeof change.val !== "number") {
//                 errors.push(`Expected a number for ${lastKey}, got: ${typeof change.val}`);
//             }
//         }

//         // // Optional: disallow dangerous types or suspicious values
//         // if (typeof change.val === "string" && change.val.includes(";")) {
//         //     errors.push(`Suspicious string value in ${lastKey}: "${change.val}"`);
//         // }
//     }

//     return {
//         valid: errors.length === 0,
//         errors,
//     };
// }

export default router;