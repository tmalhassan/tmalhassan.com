import React, { useEffect, useRef, useState, useMemo, type SetStateAction, type RefObject, type Dispatch } from "react"
import { usePage } from "../contexts/PageContext";
import { SelectOptionPage } from './PageManager';
import loadingImage from '../../../../shared/assets/loading.gif';
import { nullableAttributes, useProductEdit } from "../contexts/ProductEditContext";
import { useTheme } from "../contexts/ThemeContext";
import useDataFetch from "../hooks/useDataFetch";
import type { ColorKey, ColorVariant, FetchedProductData, ImageObject, newColorType, ProductData, sizeKey, SizeMeasurements, SizeStockBatch, VarSizeStock } from 'shared/types/ProductTypes.ts';
import type { Change, ChangeOp, ChangeVal } from 'shared/types/ChangeTypes.ts';
import type { ServerApiResponse } from "../../../../shared/types/ServerResponseTypes.ts"
import isOfType from "../../../../server/src/tools/isOfType";
import SortSizes from "../tools/SortSizes";
import useDataSend from "../hooks/useDataSend";
import SplitProductImages from "../tools/SplitProductImages";
import ImageUrl from "../tools/ImageUrl";
import serializeParams from "../tools/SerializeParams";
import { API_ROUTES } from "../../../../shared/constants/apiRouts";
import { useNotificationManager } from "./NotificationManager";
import SimpleLoading from "../components/SimpleLoading.tsx";

const stepsNames = ['product info', 'variations', 'measurements', 'search tags', 'review'];

const steps = [
  <EditProductStepOne />,
  <EditProductStepTwo />,
  <EditProductStepThree />,
  <EditProductStepFour />,
  <EditProductStepFive />
]

const defaultProductDic = {
  'id': undefined,
  'name_en': undefined,
  'original_price': undefined,
  'discount_price': undefined,
  'attributes': {
    'designer': undefined,
    'collection': undefined,
    'season': undefined,
    'category': undefined,
    'style': undefined,
    'fabric': undefined,
    'stretch_type': undefined,
    'pattern': undefined,
    'fit_type': undefined,
    'sleeve_length': undefined,
    'sleeve_type': undefined,
    'length': undefined,
    'hem_shape': undefined,
    'neckline': undefined,
    'neck_height': undefined,
    'waist_line': undefined,
    'extra': undefined
  },
  'vars': {},
  'sizes': {},
  'search-tags': [],
  'last_modified': undefined
}

const defaultVarsDic: ColorVariant = {
  'color-img': {
    'link': undefined,
    'blob': undefined
  },
  'color-name': undefined,
  'model': {
    'model-bust': undefined,
    'model-f-name': undefined,
    'model-height': undefined,
    'model-hips': undefined,
    'model-id': undefined,
    'model-ig-acc': undefined,
    'model-l-name': undefined,
    'model-pfp': undefined,
    'model-tel-number': undefined,
    'model-waist': undefined
  },
  'var-imgs': [],
  'varSizesQuantity': {},
  new_color: {
    sc: undefined,
    name: undefined,
  }
}

const defaultModelDic = {
  'model-bust': undefined,
  'model-f-name': undefined,
  'model-height': undefined,
  'model-hips': undefined,
  'model-id': undefined,
  'model-ig-acc': undefined,
  'model-l-name': undefined,
  'model-pfp': undefined,
  'model-tel-number': undefined,
  'model-waist': undefined
}

const defaultSizesDic = {
  'p-shoulders': null,
  'p-length': null,
  'p-bust': null,
  'p-waist': null,
  'p-hips': null,
  'ext-p-sleeve-length': null,
  'ext-p-belt-length': null,
  'ext-p-straps-length': null,
  'ext-p-cuff': null,
  'ext-p-bicep-length': null,
  'b-shoulders': null,
  'b-bust': null,
  'b-waist': null,
  'b-hips': null,
  'b-height': null
}

interface EditProductPageProps {
  edit: boolean;
  productID: number | null;
  title?: string;
}

export default function EditProductPage({ edit, productID }: EditProductPageProps) {
  const { theme } = useTheme();
  const { setEdit, currentStep, setCurrentStep, originalProductDic, productDic, updateProductDic, blobUrls, varNumber, setVarNumber } = useProductEdit();
  const { data, loading, error } = useDataFetch<FetchedProductData[]>(true, productID ? API_ROUTES.PRODUCTS.GET_PRODUCT : undefined, serializeParams({ id: productID }));
  const [highestStep, setHighestStep] = useState(0);

  useEffect(() => {
    // Clean up Blob URLs when component unmounts
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.length = 0;
    };
  }, []);

  useEffect(() => {
    setEdit(edit);
    if (!edit) {
      originalProductDic.current = defaultProductDic;

      updateProductDic(defaultProductDic);
      updateProductDic(draft => {
        if (!draft) return;

        draft.vars[`_${varNumber}`] = structuredClone(defaultVarsDic);
        setVarNumber(varNumber + 1);
      });
    }
  }, []);

  useEffect(() => {
    if (data && edit) {
      const updatedData = SplitProductImages(data[0]);
      originalProductDic.current = updatedData;
      // console.log(originalProductDic.current);

      updateProductDic(updatedData);
      if (data[0].discount_price === null) updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = undefined;
      });
    }
  }, [data]);

  // useEffect(() => {
  //     console.log(productDic);
  // }, [productDic]);

  useEffect(() => {
    if (currentStep > highestStep) setHighestStep(currentStep);
  }, [currentStep]);

  if (productDic) return (
    <>
      {((!productDic || loading || error) && edit) ?
        <div style={{ display: "flex", width: '100%', height: '100%', background: theme === 'light' ? '#e7e7e7' : '#353535' }}>
          <img className="loading-image" src={loadingImage} alt="" />
        </div>
        :
        <div className='edit-product-page'>
          <div className="ep-progress-bar-container">
            <div className="ep-progress-bar-background" />
            <div className="ep-progress-bar" style={{ ['--fill' as string]: `${(highestStep * 100 / 4)}%` }} />
            <div className="ep-progress-bar-steps-container">
              {stepsNames.map((title, key) => {
                return (
                  <ProgressBarStep key={key} title={title} id={key} />
                )
              })}
            </div>
          </div>

          <div className="ep-steps-container">{steps[currentStep]}</div>

          <div className="ep-next-prev-buttons-container">
            <button className="ep-prev-step-button" disabled={currentStep <= 0} onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : ''}>
              <img src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
              <p>prev. step</p>
            </button>
            <button className="ep-next-step-button" disabled={(currentStep === 1 && Object.entries(productDic.sizes).length < 1 ? true : false) || (currentStep === stepsNames.length - 1)} onClick={() => currentStep < 4 ? setCurrentStep(currentStep + 1) : ''}>
              <p>next step</p>
              <img src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
            </button>
          </div>
        </div>
      }
    </>
  )
}

function ProgressBarStep({ title, id }: { title: string; id: number; }) {
  const { currentStep, setCurrentStep, stepsValidityObj, attemptedSumbit } = useProductEdit();

  function CheckStepValidity() {
    if (id === 0 || id === 1 || id === 2) return stepsValidityObj[`step${id}`];
    else return true;
  }

  return (
    <div className="ep-progress-bar-step" data-isvalid={attemptedSumbit && !CheckStepValidity() ? 'false' : 'true'} data-isactive={id === currentStep ? 'true' : 'false'}>
      <div className="ep-progress-bar-step-circle" onClick={() => { if (attemptedSumbit || (!attemptedSumbit && currentStep > id)) setCurrentStep(id) }}>

      </div>
      <p>{title}</p>
    </div>
  )
}

function EditProductStepOne() {
  const { productDic, setStepValidity } = useProductEdit();
  const [fieldsValidity, setFieldsValidity] = useState({
    'name_en': false,
    'prices': false,
    'designer': false,
    'collection': false,
    'season': false,
    'category': false,
    'style': false,
    'fabric': false,
    'stretch_type': false,
    'pattern': false,
    'fit_type': false,
    'sleeve_length': false,
    'sleeve_type': false,
    'length': false,
    'hem_shape': false,
    'neckline': false,
    'neck_height': false,
    'waist_line': false,
    'extra': false
  });
  const attrOrder = ['designer', 'collection', 'season', 'category', 'style', 'fabric', 'stretch_type', 'pattern', 'fit_type', 'sleeve_length', 'sleeve_type', 'length', 'hem_shape', 'neckline', 'neck_height', 'waist_line', 'extra'];

  const allValid = useMemo(() => {
    // console.log(fieldsValidity);
    const values = Object.values(fieldsValidity);
    return values.length > 0 && values.every(Boolean);
  }, [fieldsValidity]);

  useEffect(() => {
    setStepValidity('step0', allValid);
  }, [allValid]);

  if (productDic?.attributes) return (
    <div className="ep-step-one-container">
      <EditProductNameInputField title={'product name'} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, "name_en": isValid } })} />

      <EditProductPriceFields onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, "prices": isValid } })} />

      <div className="ep-select-fields-container">
        {Object.entries(productDic.attributes).sort(([a], [b]) => attrOrder.indexOf(a) - attrOrder.indexOf(b)).map(([attr, val], id) => {
          if (attr === 'extra') return <EditProductExtraInputField key={id} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, "extra": isValid } })} />
          return <EditProductSelectField key={id} selectFor={attr.replace('_', ' ')} value={val} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, [attr]: isValid } })} />
        })}
      </div>
    </div>
  )
}

function EditProductStepTwo() {
  const { setTopLayerIsActive } = usePage();
  const { productDic, originalProductDic, updateProductDic, setStepValidity, varNumber, setVarNumber, attemptedSumbit } = useProductEdit();
  const [selectedVar, setSelectedVar] = useState(productDic?.vars ? Object.keys(productDic?.vars)[0] : undefined);
  const [fieldsValidity, setFieldsValidity] = useState(GenerateValidityKeys());
  const [sizesValidityObj, setSizesValidityObj] = useState(() => {
    if (!productDic) return {};
    const obj: Record<string, Record<string, boolean>> = {};

    for (const [varName, varObj] of Object.entries(productDic?.vars)) {
      obj[varName] = {};

      for (const [sizeName,] of Object.entries(varObj.varSizesQuantity)) {
        obj[varName][sizeName] = true;
      }
    }

    // console.log(obj);
    return obj
  });
  const [deletedSizes, setDeletedSizes] = useState<string[]>([]);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const sizesArray = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const isFirstRender = useRef(true);

  const activeSizes = (productDic && selectedVar) ? Object.entries(productDic.vars[selectedVar].varSizesQuantity).filter(([, val]) => val.is_deleted === 0).map(([size]) => size) : [];

  const errorResultObj = (!productDic || !selectedVar) ? { isLengthError: false, isAvailableError: false } : EditProductStockErrorLines(productDic.vars[selectedVar].varSizesQuantity);

  const allValid = useMemo(() => {
    if (!fieldsValidity) return

    // console.log(fieldsValidity);
    const values = Object.values(fieldsValidity);
    return values.length > 0 && values.every(Boolean);
  }, [fieldsValidity]);

  useEffect(() => {
    if (allValid === undefined) return;

    setStepValidity('step1', allValid);
  }, [allValid]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    UpdateDicWithSelectedSizes();
  }, [productDic?.vars])

  useEffect(() => {
    setFieldsValidity(currObj => {
      if (!selectedVar || !productDic) return { ...currObj, [`${selectedVar}.sizes`]: false }

      const selectedVarObj = productDic?.vars[selectedVar];

      return {
        ...currObj,
        [`${selectedVar}.sizes`]: Object.keys(selectedVarObj.varSizesQuantity).length < 1 || Object.values(CheckSizeValidity(selectedVar, Object.keys(selectedVarObj.varSizesQuantity))).some(val => val === false) ? false : true
      }
    })
  }, [sizesValidityObj]);

  function GenerateValidityKeys() {
    if (!productDic?.vars) return;

    const tempObj: Record<string, boolean> = {};

    Object.entries(productDic?.vars).map(([varName, value]) => {
      // color
      tempObj[`${varName}.color`] = varName.startsWith('_') || !value['color-name'] ? false : true;

      // Model
      tempObj[`${varName}.model`] = !value.model || !value.model['model-id'] ? false : true;

      // var imgs
      tempObj[`${varName}.varImgs`] = !value['var-imgs'] || value['var-imgs'].length < 1 ? false : true;

      // var color img
      tempObj[`${varName}.colorImg`] = !value['color-img'] || (!value['color-img'].link && (isOfType(value['color-img'], ['blob']) && !value['color-img'].blob)) ? false : true;

      // var sizes
      tempObj[`${varName}.sizes`] = !value['varSizesQuantity'] || Object.keys(value.varSizesQuantity).length < 1 || Object.values(CheckSizeValidity(varName, Object.keys(value.varSizesQuantity))).some(val => val === false) ? false : true;
    });

    return tempObj
  }

  function GenerateNewVarValidityKeys(varName: string) {
    setFieldsValidity(currObj => {
      return {
        ...currObj,
        [`${varName}.color`]: false,
        [`${varName}.model`]: false,
        [`${varName}.varImgs`]: false,
        [`${varName}.colorImg`]: false,
        [`${varName}.sizes`]: false
      }
    })
  }

  function CheckSizeValidity(selectedVar: string, sizesToValidate: sizeKey[]): Record<sizeKey, boolean> {
    if (!productDic) return {};

    const sizesValidityValues: Record<sizeKey, boolean> = {};

    for (const [currSize, { stock_batches: batches }] of Object.entries(productDic?.vars[selectedVar].varSizesQuantity)) {
      if (sizesToValidate.some(size => size === currSize)) {
        // console.log('validating batches of variant', selectedVar, currSize);

        const allBatchesValid = batches.map(({ current_available, is_active }) => {
          let isValid = true;

          if (current_available > 0 && is_active === 1) isValid = true;
          else if (is_active === 0) isValid = true;
          else isValid = false;

          return isValid;
        });

        sizesValidityValues[currSize] = (!allBatchesValid.some(val => val === false) && batches.length > 0);
      }
    }

    // console.warn(sizesValidityValues);
    return sizesValidityValues;
  }

  function HandleSizeButtonClick(size: string) {
    if (!selectedVar) return;

    const sizeExists = Object.prototype.hasOwnProperty.call(productDic?.vars[selectedVar].varSizesQuantity, size);
    const sizeDisabled = sizeExists ? productDic?.vars[selectedVar].varSizesQuantity[size].is_deleted : undefined;

    if (sizeExists && sizeDisabled === 0) {
      // console.warn('size exists and is active... removing size.......');
      // close
      if (deletedSizes.indexOf(size) !== -1) return;

      setDeletedSizes(sizes => [...sizes, size]);
    } else if (sizeExists && sizeDisabled === 1) {
      // console.warn('size exists but is inactive... activating size.......');

      updateProductDic(draft => {
        if (!draft) return;

        draft.vars[selectedVar].varSizesQuantity[size] = { ...draft.vars[selectedVar].varSizesQuantity[size], is_deleted: 0 };
      });
    } else {
      // console.warn('size doesnt exist... adding a new size.......');
      // open
      setAddedSize(size);

      updateProductDic(draft => {
        // console.warn('whats going on??', draft);
        if (!draft) return;

        draft.vars[selectedVar].varSizesQuantity[size] = (() => {
          // console.warn(originalProductDic.current?.vars, selectedVar);

          const varExists = originalProductDic.current?.vars?.[selectedVar];
          // console.warn(varExists);

          if (originalProductDic.current && varExists && Object.prototype.hasOwnProperty.call(originalProductDic.current?.vars?.[selectedVar]?.varSizesQuantity, size)) return { ...originalProductDic.current.vars[selectedVar].varSizesQuantity[size], is_deleted: 0 };
          else return { is_deleted: 0, stock_batches: [{ 'batch_id': undefined, 'current_available': 0, 'total_sales': 0, 'is_active': 1 }] }
        })();

        // console.log('After update:', draft.vars[selectedVar].varSizesQuantity[size]);
      });
      setSizesValidityObj(currObj => {
        const objCopy = structuredClone(currObj);

        if (!objCopy[selectedVar]) objCopy[selectedVar] = {};

        objCopy[selectedVar][size] = false;

        return objCopy;
      });
      setFieldsValidity(prev => { return { ...prev, [`${selectedVar}.sizes`]: false } });
    }
  }

  function UpdateDicWithSelectedSizes() {
    if (!productDic?.vars) return;

    // console.log('Updating product sizes');

    const allSelectedSizes: string[] = [];
    const newSelectedSizes: string[] = [];
    const newDeletedSizes: string[] = [];

    Object.entries(productDic.vars).map(([, value]) => {
      Object.entries(value.varSizesQuantity).map(([sizeName,]) => {
        if (allSelectedSizes.indexOf(sizeName) === -1) allSelectedSizes.push(sizeName);

        if (Object.keys(productDic.sizes).indexOf(sizeName) === -1) newSelectedSizes.push(sizeName);
      });
    });

    // console.error(allSelectedSizes);
    // console.error(newSelectedSizes);

    newSelectedSizes.map((size) => {
      updateProductDic(draft => {
        if (!draft) return;

        draft.sizes[size] = { ...defaultSizesDic };
      });
    });

    // delete removed sizes
    Object.keys(productDic.sizes).map((sizeName) => {
      // console.log(id, sizeName);
      if (allSelectedSizes.indexOf(sizeName) === -1 && !Object.prototype.hasOwnProperty.call(originalProductDic.current?.sizes, sizeName)) {
        // console.log('adding removed size ' + sizeName + ' to delete queue')
        newDeletedSizes.push(sizeName);
      }
    });

    // console.error(deletedSizes);

    newDeletedSizes.map((sizeName) => updateProductDic(draft => { if (!draft) return; delete draft.sizes[sizeName] }));

    // console.log(productDic.sizes);
  }

  async function HandleDeleteVariation() {
    if (!productDic?.vars || !selectedVar) return;

    const currIndex = Object.keys(productDic.vars).indexOf(selectedVar);

    const result = await (() => {
      return new Promise((resolve) => {
        setTopLayerIsActive(true, 'dialog', { title: 'Are you sure?', message: "You're about to delete a variant. The current variant data will be removed, but changes won't be saved until the final step. Would you like to proceed?", trueButton: 'Yes, delete it!' }, resolve);
      });
    })();
    // console.log(result);

    if (!result) return;

    const colorNameTags = productDic.vars[selectedVar]['color-name']?.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ' ').split(' ');
    updateProductDic(draft => {
      if (!draft) return;

      if (Object.entries(productDic.vars).length > 1) {
        delete draft.vars[selectedVar];
        RemoveValidityKeys();

        colorNameTags?.map(tag => {
          draft['search-tags'].splice(draft['search-tags'].indexOf(tag), 1);
        });

        setSelectedVar(Object.keys(productDic.vars)[currIndex === 0 ? currIndex + 1 : currIndex - 1]);
      } else {
        draft.vars[`_${varNumber}`] = { ...defaultVarsDic };
        delete draft.vars[selectedVar];
        RemoveValidityKeys();
        setSelectedVar(`_${varNumber}`);
        GenerateNewVarValidityKeys(`_${varNumber}`);
        setVarNumber(varNumber + 1);
      }
    });

    function RemoveValidityKeys() {
      if (!fieldsValidity) return;

      const objCopy = { ...fieldsValidity };
      Object.entries(fieldsValidity).filter(([entry,]) => entry.startsWith(`${selectedVar}.`)).map(([key,]) => {
        delete objCopy[key];
      });

      setFieldsValidity(objCopy);
    }
  }

  function ReplaceValidityKeys(oldVar: string, newVar: string) {
    if (!fieldsValidity) return;

    const objCopy = { ...fieldsValidity };
    Object.entries(fieldsValidity).filter(([entry,]) => entry.startsWith(`${oldVar}.`)).map(([key,]) => {
      const secondKeyPart = key.split('.')[1];

      const oldVal = objCopy[key];
      delete objCopy[key];
      objCopy[`${newVar}.${secondKeyPart}`] = oldVal;

      // console.log('oldVar ' + oldVal);
      // console.log('newVar ' + newVar);
      // console.log('secondKeyPart ' + secondKeyPart);
    });

    setFieldsValidity(objCopy);
  }

  function EditProductStockErrorLines(varSizesStock: Record<sizeKey, VarSizeStock>): { isLengthError: boolean; isAvailableError: boolean; } {
    let isLengthError = false;
    let isAvailableError = false;

    for (const [, { stock_batches: batches }] of Object.entries(varSizesStock)) {
      if (batches.length < 1) isLengthError = true;

      for (const { current_available, is_active } of batches) {
        if (is_active === 1 && current_available < 1) isAvailableError = true;
      }
    }

    return { isLengthError, isAvailableError };
  }

  const oldName = (productDic && selectedVar) ? productDic.vars[selectedVar]["color-name"] : undefined;
  const newName = (productDic && selectedVar) ? productDic.vars[selectedVar].new_color.name : undefined;

  if (productDic?.vars && selectedVar) return (
    <div className="ep-step-two-container">
      <EditProductImagesContainer selectedVar={selectedVar} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, [`${selectedVar}.varImgs`]: isValid } })} />

      <EditPageVariationButtonsContainer selectedVar={selectedVar} setSelectedVar={setSelectedVar} fieldsValidity={fieldsValidity} generateNewVarValidityKeys={GenerateNewVarValidityKeys} />

      <div className="ep-sections-grid-container">
        <div className="ep-grid-section">
          <div className="ep-select-fields-container">
            <p className="ep-section-title">variant details</p>
            <div className="ep-color-select-section">
              <EditPageVariationColorImageContainer selectedVar={selectedVar} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, [`${selectedVar}.colorImg`]: isValid } })} />
              <div className="color-select-warning-wrapper">
                <EditProductSelectField selectFor={'color'} value={newName ?? oldName} selectedVar={selectedVar} setSelectedVar={setSelectedVar} replaceValidityKeys={ReplaceValidityKeys} onValidate={(isValid) => setFieldsValidity(prev => { return { ...prev, [`${selectedVar}.color`]: isValid } })} />
                {newName &&
                  <p className="color-change-warning">{`* Variant color will change from ${oldName} to ${newName}`}</p>
                }
              </div>
            </div>
            <div className="ep-variation-sizes-select-container">
              <p>variant sizes:</p>
              <div className="ep-variation-sizes-select-buttons-container">
                {sizesArray.map((size, i) => {
                  return (
                    <button className="ep-variation-size-button" key={i} data-isactive={Object.prototype.hasOwnProperty.call(productDic.vars[selectedVar].varSizesQuantity, size) && productDic.vars[selectedVar].varSizesQuantity[size].is_deleted === 0 && deletedSizes.indexOf(size) === -1 ? 'true' : 'false'} onClick={() => HandleSizeButtonClick(size)}>
                      <p>{size}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="ep-variation-sizes-stock-container">
              {Object.entries(productDic.vars[selectedVar].varSizesQuantity).length < 1 &&
                <p>Please select the available variant sizes above</p>
              }
              {SortSizes(activeSizes).map((size, i) => {
                return (
                  <EditPageVariationSizeStockContainer key={size + i} size={size} selectedVar={selectedVar} deletedSizes={deletedSizes} setDeletedSizes={setDeletedSizes} addedSize={addedSize} setAddedSize={setAddedSize} setSizesValidityObj={setSizesValidityObj} />  /* onValidate={(isValid: boolean) => setFieldsValidity(prev => {return {...prev, [`${selectedVar}.sizes`] : isValid}})} */
                )
              })}
            </div>
          </div>
          <p className="ep-extra-info">You will adjust the size measurements in the next step.</p>
          {attemptedSumbit &&
            <div className="ep-error-line-container">
              {(!productDic.vars[selectedVar]['color-name'] || productDic.vars[selectedVar]['color-name'].startsWith('_')) &&
                <EditProductErrorLine errorMessage={"You must select a color name for each variant."} />
              }
              {((!productDic.vars[selectedVar]['color-img']) || (!productDic.vars[selectedVar]['color-img'].link && (isOfType(productDic.vars[selectedVar]['color-img'], ['blob']) && !productDic.vars[selectedVar]['color-img'].blob))) &&
                <EditProductErrorLine errorMessage={"Please select an image for the variant color."} />
              }
              {Object.entries(productDic.vars[selectedVar].varSizesQuantity).length < 1 &&
                <EditProductErrorLine errorMessage={"Each variant must have a minimum of 1 size selected."} />
              }
              {errorResultObj.isLengthError &&
                <EditProductErrorLine errorMessage={"Each size must have a minimum of 1 batch."} />
              }
              {errorResultObj.isAvailableError &&
                <EditProductErrorLine errorMessage={"One or more of your active batchs have a value of 0."} />
              }
            </div>
          }
        </div>

        <div className="ep-grid-section">
          <EditPageVariationModelContainer selectedVar={selectedVar} onValidate={(isValid: boolean) => setFieldsValidity(prev => { return { ...prev, [`${selectedVar}.model`]: isValid } })} />
        </div>
      </div>

      <button className="ep-variation-delete-button" onClick={() => HandleDeleteVariation()}>
        <img src={ImageUrl('ui-images/delete-icon.svg')} alt='' />
        <p>delete variant</p>
      </button>
    </div>
  )
}

function EditProductStepThree() {
  const { setTopLayerIsActive } = usePage();
  const { productDic, setStepValidity } = useProductEdit();
  const [sizesArray] = useState(SelectedSizes());
  const [activeSize, setActiveSize] = useState(sizesArray[0]);
  const [activeTarget, setActiveTarget] = useState<'product' | 'body' | 'extra'>('product');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [partsValidity, setPartsValidity] = useState(() => {
    if (!productDic?.sizes) return;

    const validityObject: Record<string, Record<string, boolean>> = {};

    Object.entries(productDic?.sizes).forEach(([size, partsMsrmnts]) => {
      Object.entries(partsMsrmnts).forEach(([partName, measuremnt]) => {
        // console.log(size + partName);
        if (!validityObject[size]) validityObject[size] = {};

        validityObject[size][partName] = measuremnt === null ? true : CheckValueValidity(measuremnt);
      });
    });

    // console.log(validityObject);
    return validityObject;
    // console.warn(productDic.sizes);
  });
  const [groupsValidity, setGroupsValidity] = useState(CheckGroupValidity());
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const buttonsPositions = {
    'p-length': 'translate(clamp(0px, 15vw, 75px), clamp(0px, 28.5vw, 145px))', // 'translate(15vw, 28.5vw)'
    'p-shoulders': 'translate(clamp(0px, 32vw, 160px), clamp(0px, 34vw, 170px))', // 'translate(32vw, 34vw)'
    'p-bust': 'translate(clamp(0px, 34vw, 170px), clamp(0px, 45vw, 225px))', // 'translate(34vw, 45vw)'
    'p-waist': 'translate(clamp(0px, 40vw, 200px), clamp(0px, 62vw, 310px))', // 'translate(40vw, 62vw)'
    'p-hips': 'translate(clamp(0px, 31vw, 155px), clamp(0px, 83vw, 415px))', // 'translate(31vw, 83vw)'
    'b-height': 'translate(clamp(0px, 80vw, 400px), clamp(0px, 1vw, 5px))', // 'translate(80vw, 1vw)'
    'b-shoulders': 'translate(clamp(0px, 59vw, 295px), clamp(0px, 31vw, 155px))', // 'translate(59vw, 31vw)'
    'b-bust': 'translate(clamp(0px, 58vw, 290px), clamp(0px, 44vw, 220px))', // 'translate(58vw, 44vw)'
    'b-waist': 'translate(clamp(0px, 52vw, 260px), clamp(0px, 62vw, 310px))', // 'translate(52vw, 62vw)'
    'b-hips': 'translate(clamp(0px, 55vw, 275px), clamp(0px, 83vw, 415px))' // 'translate(55vw, 83vw)'
  };

  const allValid = useMemo(() => {
    if (!partsValidity) return;

    for (const [, value] of Object.entries((partsValidity))) {
      for (const [, partVal] of Object.entries(value)) {
        if (!partVal) return false;
      }
    }
    return true;
  }, [partsValidity]);

  useEffect(() => {
    if (allValid === undefined) return;

    setStepValidity('step2', allValid);
  }, [allValid]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // console.log(partsValidity);
    setGroupsValidity(CheckGroupValidity());
  }, [partsValidity]);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (buttonRef.current && !buttonRef.current.contains(target)) setSelectedPart(null);
  };

  async function OpenInfoBox() {
    await new Promise((resolve) => {
      setTopLayerIsActive(true, 'alert', { title: 'Size Measurements', message: `All measurements can take a single value (e.g. "50") or a range format by separating two numbers with a "-" (e.g. "50-53")` }, resolve);
    });
  }

  function CheckValueValidity(valueString: string) {
    let isValid = true;

    const valArray = valueString.replace(/[\s]/g, '').split('-');

    for (let i = 0; i < valArray.length; i++) {
      if (valArray[i] === '' || valArray[i] === null) continue;

      if (!valArray[i].match(/^[1-9]\d*(\.\d+)?$/)) {
        isValid = false;
        // console.log('the value ' + valArray[i] + 'is: ' + isValid);
        break;
      }
    }

    const firstValue = valArray[0] ? parseFloat(valArray[0]) : null;
    const secondValue = valArray[1] ? parseFloat(valArray[1]) : null;

    if (isValid === false) return false;
    if (secondValue) { if (secondValue && firstValue && (secondValue > firstValue)) { return true } else return false } else return isValid
  }

  function CheckGroupValidity() {
    if (!partsValidity) return;

    let productVal = true;
    let bodyVal = true;
    let extraVal = true;

    if (Object.entries(partsValidity).length < 1) return [productVal, bodyVal, extraVal]

    // for product
    Object.entries(partsValidity?.[activeSize]).filter(([partName,]) => partName.startsWith('p-')).map(([, isvalid]) => {
      if (!isvalid) productVal = false
    });

    // for body
    Object.entries(partsValidity?.[activeSize]).filter(([partName,]) => partName.startsWith('b-')).map(([, isvalid]) => {
      if (!isvalid) bodyVal = false
    });

    // for extra
    Object.entries(partsValidity?.[activeSize]).filter(([partName,]) => partName.startsWith('ext-')).map(([, isvalid]) => {
      if (!isvalid) extraVal = false
    });

    return [productVal, bodyVal, extraVal]
  }

  function CheckSizeValidity(size: string) {
    if (!partsValidity) return;

    let isvalid = true;

    // console.log(productDic.sizes)
    // console.log(partsValidity);

    Object.entries(partsValidity[size]).forEach(([, value]) => {
      if (value === false) isvalid = false;
    });

    return isvalid
  }

  function SelectedSizes() {
    if (!productDic?.sizes) return [];

    const selectedSizes: string[] = [];
    const modifSizes = [];
    const theOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

    Object.entries(productDic.sizes).map(([sizeName,]) => {
      if (selectedSizes.indexOf(sizeName) === -1) {
        selectedSizes.push(sizeName);
      }
    });

    for (let i = 0; i < theOrder.length; i++) {
      if (selectedSizes.indexOf(theOrder[i]) > -1) {
        modifSizes.push(theOrder[i]);
      }
    }
    return modifSizes;
  }

  if (groupsValidity) return (
    <div className="ep-step-three-container">
      <div className="ep-measurement-targets-container">
        <div className="ep-measurement-target-button-wrapper" data-isvalid={groupsValidity[0].toString()} data-isactive={activeTarget === 'product'}>
          <button onClick={() => setActiveTarget('product')}>product</button>
          <hr />
        </div>
        <div className="ep-measurement-target-button-wrapper" data-isvalid={groupsValidity[1].toString()} data-isactive={activeTarget === 'body'}>
          <button onClick={() => setActiveTarget('body')}>body</button>
          <hr />
        </div>
        <div className="ep-measurement-target-button-wrapper" data-isvalid={groupsValidity[2].toString()} data-isactive={activeTarget === 'extra'}>
          <button onClick={() => setActiveTarget('extra')}>extra</button>
          <hr />
        </div>
      </div>
      <div className="ep-msrmnts-extra-parent-container" data-isactive={activeTarget === 'extra' ? 'true' : 'false'} >
        <div className="ep-select-fields-container">
          <EditProductSizeInputField inputFor={'ext-p-sleeve-length'} activeSize={activeSize} setPartsValidity={setPartsValidity} />
          <EditProductSizeInputField inputFor={'ext-p-bicep-length'} activeSize={activeSize} setPartsValidity={setPartsValidity} />
          <EditProductSizeInputField inputFor={'ext-p-belt-length'} activeSize={activeSize} setPartsValidity={setPartsValidity} />
          <EditProductSizeInputField inputFor={'ext-p-straps-length'} activeSize={activeSize} setPartsValidity={setPartsValidity} />
          <EditProductSizeInputField inputFor={'ext-p-cuff'} activeSize={activeSize} setPartsValidity={setPartsValidity} />
        </div>
      </div>
      <div className="ep-msrmnts-parent-container">
        <div className="ep-msrmnts-model-and-buttons-wrapper">
          <div className="ep-msrmnts-buttons-container">
            <SizePopupContainer partID={'b-height'} activeSize={activeSize} isVisible={activeTarget === 'body' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['b-height']} />
            <SizePopupContainer partID={'b-shoulders'} activeSize={activeSize} isVisible={activeTarget === 'body' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['b-shoulders']} />
            <SizePopupContainer partID={'b-bust'} activeSize={activeSize} isVisible={activeTarget === 'body' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['b-bust']} />
            <SizePopupContainer partID={'b-waist'} activeSize={activeSize} isVisible={activeTarget === 'body' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['b-waist']} />
            <SizePopupContainer partID={'b-hips'} activeSize={activeSize} isVisible={activeTarget === 'body' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['b-hips']} />

            <SizePopupContainer partID={'p-length'} activeSize={activeSize} isVisible={activeTarget === 'product' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['p-length']} />
            <SizePopupContainer partID={'p-shoulders'} activeSize={activeSize} isVisible={activeTarget === 'product' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['p-shoulders']} />
            <SizePopupContainer partID={'p-bust'} activeSize={activeSize} isVisible={activeTarget === 'product' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['p-bust']} />
            <SizePopupContainer partID={'p-waist'} activeSize={activeSize} isVisible={activeTarget === 'product' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['p-waist']} />
            <SizePopupContainer partID={'p-hips'} activeSize={activeSize} isVisible={activeTarget === 'product' ? true : false} selectedPart={selectedPart} setSelectedPart={setSelectedPart} setPartsValidity={setPartsValidity} buttonRef={buttonRef} buttonPos={buttonsPositions['p-hips']} />
          </div>
          <div className="ep-msrmnts-model-image-container">
            <button onClick={OpenInfoBox}>
              <img className='button-icon' src={ImageUrl('ui-images/exclamation-icon.svg')} alt='' />
            </button>
            <ModelSizeVectorParts selectedPart={selectedPart} activeSize={activeSize} activeTarget={activeTarget} partsValidity={partsValidity} />
          </div>
        </div>
        <div className="ep-msrmnts-hover-sections-wrapper">
          <div className="ep-msrmnts-hover-section" onPointerEnter={(e) => { if (e.pointerType === "touch" || selectedPart || activeTarget === 'extra') return; setActiveTarget('product') }}></div>
          <div className="ep-msrmnts-hover-section" onPointerEnter={(e) => { if (e.pointerType === "touch" || selectedPart || activeTarget === 'extra') return; setActiveTarget('body') }}></div>
        </div>
      </div>
      <div className="ep-available-sizes-container">
        {sizesArray && sizesArray.map((size, id) => {
          return (
            <div className="ep-measurement-target-button-wrapper" key={id} data-isvalid={CheckSizeValidity(size)?.toString()} data-isactive={activeSize === size ? 'true' : 'false'} onClick={() => setActiveSize(size)}>
              <button>{size}</button>
              <hr />
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FreqTagsType {
  tag: string;
  tag_count: number
}

interface SearchWordsTagsType {
  name: string
}

function EditProductStepFour() {
  const { currentDevice } = usePage();
  const { productDic, originalProductDic, updateProductDic } = useProductEdit();
  const [searchInputValue, setSearchInputValue] = useState('');
  const { data } = useDataFetch<FreqTagsType[]>(true, API_ROUTES.PRODUCTS.GET_FREQUENT_TAGS);
  const { data: searchData, sendData } = useDataFetch<SearchWordsTagsType[]>(false, API_ROUTES.PRODUCTS.GET_SEARCH_TAGS, serializeParams({ word: searchInputValue }));
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [overrideStyleST, setOverrideStyleST] = useState(false);
  const [freqUsedTags, setFreqUsedTags] = useState<string[]>([]);
  const [overrideStyleFU, setOverrideStyleFU] = useState(false);
  const [addEnabled, setAddEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const stepFourPageRef = useRef<HTMLDivElement | null>(null);
  const searchBarWrapperRef = useRef<HTMLDivElement | null>(null);
  const suggestedTagsContainerRef = useRef<HTMLDivElement | null>(null);
  const freqUsedTagsContainerRef = useRef<HTMLDivElement | null>(null);
  const inputField = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typeDelayRef = useRef<NodeJS.Timeout | null>(null);
  const autoTagsConRef = useRef<HTMLDivElement | null>(null);
  const manualTagsConRef = useRef<HTMLDivElement | null>(null);
  const deletedTagsConRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const container = stepFourPageRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const freqUsedTagsCon = freqUsedTagsContainerRef.current;
      const suggestedTagsCon = suggestedTagsContainerRef.current;

      if (freqUsedTagsCon) {
        const fullWidth = freqUsedTagsCon.scrollWidth + freqUsedTagsCon.scrollLeft;
        setOverrideStyleFU(fullWidth > Math.ceil(freqUsedTagsCon.getBoundingClientRect().width));
      }

      if (suggestedTagsCon) {
        const fullWidth = suggestedTagsCon.scrollWidth + suggestedTagsCon.scrollLeft;
        // console.log(fullWidth, Math.ceil(suggestedTagsCon.getBoundingClientRect().width));
        setOverrideStyleST(fullWidth > Math.ceil(suggestedTagsCon.getBoundingClientRect().width));
      }
    });

    observer.observe(container);
    GenerateTags();

    document.addEventListener('keydown', HandleEnterKeyClick);
    return () => {
      if (typeDelayRef.current) clearTimeout(typeDelayRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      document.removeEventListener('keydown', HandleEnterKeyClick)
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!data) return;

    setFreqUsedTags(Object.entries(data).map(([, value]) => {
      return value.tag;
    }));
  }, [data]);

  useEffect(() => {
    GenerateTags();
  }, [productDic?.['search-tags']])

  // useEffect(() => {
  //     console.log(manualTags);
  // }, [manualTags])

  // useEffect(() => {
  //     console.log(removedTags);
  // }, [removedTags])

  useEffect(() => {
    if (!freqUsedTagsContainerRef.current) return;

    const fullWidth = freqUsedTagsContainerRef.current.scrollWidth + freqUsedTagsContainerRef.current.scrollLeft;

    if (fullWidth > Math.ceil(freqUsedTagsContainerRef.current.getBoundingClientRect().width)) setOverrideStyleFU(true);
    else setOverrideStyleFU(false);
  }, [freqUsedTags]);

  useEffect(() => {
    if (addEnabled) setAddEnabled(false);
    if (typeDelayRef.current) clearTimeout(typeDelayRef.current);

    if (searchInputValue == '') {
      setSuggestedTags([]);
      return;
    }

    if (searchInputValue.length < 2) return;

    typeDelayRef.current = setTimeout(() => sendData(serializeParams({ word: searchInputValue })), 500); // typeDelayRef.current = setTimeout(() => sendData(), 500);

    // Cleanup function to handle component unmounting
    return () => { if (typeDelayRef.current) clearTimeout(typeDelayRef.current); }
  }, [searchInputValue]);

  useEffect(() => {
    if (!searchData) return;

    setSuggestedTags(Object.entries(searchData).map(([, value]) => {
      return value.name;
    }));
  }, [searchData]);

  useEffect(() => {
    if (!suggestedTagsContainerRef.current) return;

    const fullWidth = suggestedTagsContainerRef.current.scrollWidth + suggestedTagsContainerRef.current.scrollLeft;

    if (fullWidth > Math.ceil(suggestedTagsContainerRef.current.getBoundingClientRect().width)) setOverrideStyleST(true);
    else setOverrideStyleST(false);
  }, [suggestedTags]);

  useEffect(() => {
    if (searchInputValue === '') return

    // console.log(suggestedTags);
    EvaluateValue(searchInputValue);
  }, [suggestedTags]);

  function HandleEnterKeyClick(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (!addEnabled) return;

      AddNewTag(searchInputValue);
    }
  }

  function GenerateTags() {
    if (!productDic) return;

    const tagsFromName = (productDic.name_en === null || productDic.name_en === undefined || productDic.name_en === '') ? [] : productDic.name_en?.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ' ').split(' ') ?? [];
    // console.log(tagsFromName);

    const tagsFromVars: string[] = [];
    Object.entries(productDic.vars).map(([, val]) => {
      const target = val.new_color.name ?? val['color-name'];

      target?.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, ' ').split(' ').forEach(tag => {
        if (tagsFromVars.indexOf(tag) === -1 && tag !== '') tagsFromVars.push(tag);
      });
    });
    // console.log(tagsFromVars);

    const tagsFromAttr: string[] = [];
    Object.entries(productDic.attributes).map(([, val]) => {
      val?.toLowerCase().replace(/[^a-zA-Z0-9]/g, ' ').split(' ').forEach(tag => {
        if (tagsFromAttr.indexOf(tag) === -1 && tag !== '') tagsFromAttr.push(tag);
      });
    });
    // console.log(tagsFromAttr);

    const automaticTags = [...new Set([...tagsFromName, ...tagsFromVars, ...tagsFromAttr])];

    if (isFirstRender.current) {
      let newTags: string[] = [];
      automaticTags.forEach(tag => {
        if (!productDic['search-tags'].includes(tag)) newTags = [...newTags, tag];
      });

      updateProductDic(draft => {
        if (!draft) return;

        draft['search-tags'] = [...new Set([...draft['search-tags'], ...newTags])];
      });

      isFirstRender.current = false;
    }

    // console.log(automaticTags);

    // update auto tags...
    setAutoTags(automaticTags);

    // update manual tags...
    setManualTags(productDic['search-tags'].filter(tag => !automaticTags.includes(tag)));

    // update removed tags...
    setRemovedTags(originalProductDic.current?.['search-tags'] ? originalProductDic.current['search-tags'].filter(tag => !productDic['search-tags'].includes(tag)) : []);
  }

  function HandleSearchType(value: string) {
    const val = value.replace(/[\s]/g, '');

    if (!val.match(/^[a-zA-Z0-9]*$/)) return;

    setSearchInputValue(val);
  }

  function EvaluateValue(value: string) {
    // console.log(value);
    if (suggestedTags.indexOf((value).toLowerCase()) === -1) {
      setAddEnabled(true);
      speedUpAnimation();
    }
  }

  const speedUpAnimation = () => {
    if (!searchBarWrapperRef.current) return;

    searchBarWrapperRef.current.style.setProperty("--duration", "2s");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setTimeout(() => {
      searchBarWrapperRef.current?.style.setProperty("--duration", "15s");
      timeoutRef.current = null;
    }, 750);
  };

  function AddNewTag(tagName: string) {
    if (productDic?.['search-tags'].includes(tagName)) return;

    updateProductDic(draft => {
      if (!draft) return;

      draft['search-tags'].push(tagName);
    });
  }

  function handleClearSearchBar() {
    setSearchInputValue('');
    setSuggestedTags([]);
    inputField.current?.focus();
  }

  return (
    <div className="ep-step-four-container" ref={stepFourPageRef}>
      <div className="ep-tags-search-bar-wrapper" data-isvisible={(!!searchInputValue).toString()}>
        <div className="ep-tags-search-bar-container" ref={searchBarWrapperRef}>
          <div className="ep-tags-input-container" onClick={() => inputField.current?.focus()}>
            <input ref={inputField} type="text" value={searchInputValue} onChange={(e) => HandleSearchType(e.target.value)} placeholder={`Search existing tags...`} />
            <button className="search-bar-clear-button" disabled={!searchInputValue} onClick={(e) => (e.stopPropagation(), handleClearSearchBar())}>
              <img src={ImageUrl('ui-images/x-circle-icon.svg')} alt='' />
            </button>
          </div>
          <button className="search-bar-add-button" disabled={!addEnabled} onClick={(e) => (e.stopPropagation(), AddNewTag(searchInputValue), handleClearSearchBar())}>add</button>
        </div>
        <div className="search-bar-results-container" ref={suggestedTagsContainerRef} style={{ justifyContent: overrideStyleST ? 'flex-start' : 'center' }}>
          {suggestedTags.length > 0 ?
            suggestedTags.map((tag, id) => {
              return <TagButton key={id} autoTags={autoTags} manualTags={manualTags} removedTags={removedTags} tagFor={'other'} tagName={tag} interactable={true} />
            })
            :
            <p className="ep-no-suggested-tags" data-isvisible={(!!searchInputValue).toString()}>No matching tags found... consider adding it!</p>
          }
        </div>
      </div>
      <div className="ep-freq-used-tags-container">
        <p>Frequently used tags:</p>
        <div className="ep-freq-used-tags" ref={freqUsedTagsContainerRef} style={{ justifyContent: overrideStyleFU ? 'flex-start' : 'center' }}>
          {freqUsedTags.length > 0 ?
            freqUsedTags.map((tag, id) => {
              return <TagButton key={id} autoTags={autoTags} manualTags={manualTags} removedTags={removedTags} tagFor={'other'} tagName={tag} interactable={true} />
            })
            :
            <p className="ep-no-suggested-tags" data-isvisible={(freqUsedTags.length > 0).toString()}>No enough data found... add more products!</p>
          }
        </div>
      </div>
      <div className="ep-tags-sections-container">
        <div className="ep-tags-auto-section" ref={autoTagsConRef} data-isactive={activeSection === 'auto' || currentDevice === 'desktop' ? 'true' : 'false'} onClick={() => setActiveSection(activeSection === 'auto' ? null : 'auto')} style={{ maxHeight: (activeSection === 'auto' || currentDevice === 'desktop') ? `${(autoTagsConRef.current?.scrollHeight ?? 0) + 40}px` : "125px" }}>
          <p>Auto Generated</p>
          <hr></hr>
          <div className="ep-tags-container">
            {autoTags.map((tag, id) => {
              return <TagButton key={id} autoTags={autoTags} manualTags={manualTags} removedTags={removedTags} tagFor={'auto'} tagName={tag} interactable={false} />
            })}
            <p className="ep-no-tags-found-text" data-isactive={autoTags.length < 1 ? 'true' : 'false'}>No tags generated... Please complete the previous steps.</p>
          </div>
          <button>
            <img src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
          </button>
        </div>
        <div className="ep-tags-manual-section" ref={manualTagsConRef} data-isactive={activeSection === 'manual' || currentDevice === 'desktop' ? 'true' : 'false'} onClick={() => setActiveSection(activeSection === 'manual' ? null : 'manual')} style={{ maxHeight: (activeSection === 'manual' || currentDevice === 'desktop') ? `${(manualTagsConRef.current?.scrollHeight ?? 0) + 40}px` : "125px" }}>
          <p>Manually Added</p>
          <hr></hr>
          <div className="ep-tags-container">
            {manualTags.map((tag, id) => {
              return <TagButton key={id} autoTags={autoTags} manualTags={manualTags} removedTags={removedTags} tagFor={'manual'} tagName={tag} interactable={true} />
            })}
            <p className="ep-no-tags-found-text" data-isactive={manualTags.length < 1 ? 'true' : 'false'}>Use the search bar above to search and add tags manually.</p>
          </div>
          <button>
            <img src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
          </button>
        </div>
        <div className="ep-tags-removed-section" ref={deletedTagsConRef} data-isactive={activeSection === 'removed' || currentDevice === 'desktop' ? 'true' : 'false'} onClick={() => setActiveSection(activeSection === 'removed' ? null : 'removed')} style={{ maxHeight: (activeSection === 'removed' || currentDevice === 'desktop') ? `${(deletedTagsConRef.current?.scrollHeight ?? 0) + 40}px` : "125px" }}>
          <p>Removed</p>
          <hr></hr>
          <div className="ep-tags-container">
            {removedTags.map((tag2, id) => {
              return <TagButton key={id} autoTags={autoTags} manualTags={manualTags} removedTags={removedTags} tagFor={'removed'} tagName={tag2} interactable={true} />
            })}
            <p className="ep-no-tags-found-text" data-isactive={removedTags.length < 1 ? 'true' : 'false'}>No tags removed! unsaved removed tags will be displayed here.</p>
          </div>
          <button>
            <img src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditProductStepFive() {
  const { currentPage, setIsSubmitting, secondLayerPageIsActive, setSecondLayerPageIsActive, CloseThirdLayerPage, setTopLayerIsActive, setRefreshAppContainer } = usePage();
  const { Notify } = useNotificationManager();
  const { edit, productDic, originalProductDic, stepsValidityObj, setAttemptedSubmit } = useProductEdit();
  const { data, statusCode, loading, error, sendData } = useDataSend<ServerApiResponse>();
  const [changes, setChanges] = useState<Change[]>([]);
  const [submitIsValid, setSubmitIsValid] = useState<boolean | undefined>(undefined);
  const [varsChangesObj, setVarsChangesObj] = useState<Record<string, Change[]> | undefined>(undefined);
  const [varImgsChangesObj, setVarImgsChangesObj] = useState<Record<string, Record<ChangeOp, number>> | undefined>(undefined);
  const [varModelChangesObj, setVarModelChangesObj] = useState<Record<string, Record<string, ChangeVal[]>> | undefined>(undefined);
  const [sizesChangesObj, setSizesChangesObj] = useState<Record<string, Change[]> | undefined>(undefined);
  const [allStepsValid] = useState(CheckStepsValidity());

  useEffect(() => {
    async function runComparison() {
      if (!originalProductDic.current || !productDic) return;

      const localChanges: Change[] = [];
      const result = await DeepCompare(originalProductDic.current, productDic, '', localChanges);
      setChanges(localChanges);
      // console.warn(!result);
      setSubmitIsValid(!result);
    }

    runComparison();
    setAttemptedSubmit(true);
  }, []);

  useEffect(() => {
    setIsSubmitting(false);
    if (data?.code === 'ERR_CONFLICT') ResolveVersionConflict();
    else if (data) Notify({ type: data.type, message: data.message, duration: 3000 });
    else if (error?.name === 'ERR_INTERNET_DISCONNECTED') Notify({ type: 'error', message: error.message, duration: 3000 });
    else if (error) Notify({ type: 'error', message: 'An unknown error occurred! Please try again later.', duration: 3000 });

    if ((data?.code === 'OK_UPDATED' && edit) || (data?.code === 'OK_CREATED' && !edit)) {
      if (secondLayerPageIsActive.isActive) {
        const refreshCount = secondLayerPageIsActive.refreshPage + 1;
        // console.log('submit successful! refreshing product page... ', refreshCount);
        setSecondLayerPageIsActive(secondLayerPageIsActive.isActive, secondLayerPageIsActive.content, refreshCount);
      }

      if (currentPage === 1) {
        setRefreshAppContainer(currCount => currCount + 1);
      }

      // auto close this layer and update the product info page somehow
      CloseThirdLayerPage();
    }

    // console.log('data: ', data);
    // console.log('loading: ', loading);
    // console.log('error: ', error);
  }, [data, statusCode, error]);

  useEffect(() => {
    // for (let i = 0; i < changes.length; i++) {
    //     console.log(changes[i]);
    //     // const element = array[i];
    // }

    const mergedVars = changes.reduce((acc: Record<ColorKey, Change[]>, change) => {
      if (change.path.startsWith('vars.')) {
        const varCol = change.path.split('.')[1] as ColorKey;

        if (!acc[varCol]) {
          acc[varCol] = [change];
        } else {
          acc[varCol] = [...acc[varCol], change];
        }
      }
      // console.log(acc);
      return acc;
    }, {});
    const mergedVarImgs = changes.reduce((acc: Record<ColorKey, Record<ChangeOp, number>>, change) => {
      const path = change.path;
      if (path.split('.').filter(level => level === 'var-imgs').length > 0) {
        const varCol = path.split('.')[1] as ColorKey;
        const op: ChangeOp = change.op;

        if (!acc[varCol]) {
          acc[varCol] = { add: 0, replace: 0, remove: 0, update: 0 };
          acc[varCol][op]++;
        } else {
          acc[varCol][op]++;
        }
      }
      // console.log(acc);
      return acc;
    }, {});
    const mergedModel = changes.reduce((acc: Record<ColorKey, Record<string, ChangeVal[]>>, change) => {
      const path = change.path;
      const pathTarget = path.split('.').pop();
      if (pathTarget === 'model-f-name' || pathTarget === 'model-l-name') {
        const varCol = path.split('.')[1] as ColorKey;
        if (!acc[varCol]?.[pathTarget]) {
          if (!acc[varCol]) acc[varCol] = {};
          acc[varCol][pathTarget] = change.val;
        } else {
          acc[varCol][pathTarget] = [...acc[varCol][pathTarget], change.val];
        }
      }
      // console.log(acc);
      return acc;
    }, {});
    const mergedSizes = changes.reduce((acc: Record<sizeKey, Change[]>, change) => {
      const path = change.path;
      if (path.startsWith('sizes.')) {
        const size = path.split('.')[1];
        if (!acc[size]) {
          acc[size] = [change];
        } else {
          acc[size] = [...acc[size], change];
        }
      }
      // console.log(acc);
      return acc;
    }, {});

    setVarsChangesObj(mergedVars);
    setVarImgsChangesObj(mergedVarImgs);
    setVarModelChangesObj(mergedModel);
    setSizesChangesObj(mergedSizes);
  }, [changes]);

  function HandleUpload(forced = false) {
    if (!productDic?.vars) return;
    // fix color-img upload
    // reduce model info... all info -> model-id

    // console.log(JSON.stringify(edit ? changes : productDic));

    setIsSubmitting(true);

    const apndData = AppendData(edit, forced);

    if (edit) sendData('PUT', API_ROUTES.PRODUCTS.EDIT_PRODUCT, apndData);
    else sendData('POST', API_ROUTES.PRODUCTS.ADD_PRODUCT, apndData);
  }

  function AppendData(forEdit: boolean, force = false): FormData {
    if (!productDic) return new FormData();

    const formData = new FormData();
    const modifVarImgs: Record<ColorKey, number[]> = {};
    let generatedUUID: string | undefined;

    for (const varName of Object.keys(productDic.vars)) {
      // console.warn(varName);
      const isModif = changes.some(change => {
        const hasVarImgsChanges = change.path.includes(`${varName}.var-imgs`); // an existing var and the imgs were modified
        const isNewVariant = change.op === 'add' && change.path === `vars.${varName}`; // is a new added variant (having at least 1 image is mandatory)

        if (isNewVariant) AppendForNewVar(change.val[0] as ColorVariant, change.path.split('.').pop() as ColorKey);

        return hasVarImgsChanges || isNewVariant;
      });

      if (isModif) {
        // -1 = newly added image
        modifVarImgs[varName] = productDic.vars[varName]["var-imgs"].map((imgString,) => imgString.link?.startsWith('blob:') ? -1 : parseInt(imgString.link!.replace('-thumb', '').split('/').pop()!.split('.')[0]));
      } else continue;
    }

    if (Object.keys(modifVarImgs).length > 0) formData.append('modifVarImgs', JSON.stringify(modifVarImgs));

    if (forEdit && productDic.id) {
      formData.append('data', JSON.stringify(FilterChanges(changes, Object.keys(modifVarImgs).length > 0)));
      formData.append('pID', (productDic.id).toString());
      if (productDic.last_modified) formData.append('lastModif', new Date(productDic.last_modified).toISOString());
      if (force) formData.append('force', (true).toString());
    } else {
      // for add new product
      formData.append('data', JSON.stringify(productDic));
    }

    // for new variants...
    function AppendForNewVar(newVar: ColorVariant, varCC: ColorKey) {
      newVar["var-imgs"].map((imgObj, i) => {
        const key = `${varCC}-${i}`;
        formData.append(key, (imgObj as { blob: Blob }).blob);
      });

      const key = `${varCC},`;
      formData.append(key, (newVar["color-img"] as { blob: Blob }).blob);

      if (!generatedUUID) generatedUUID = GetRandomUUID();
    }

    // for existing variants with newly added images...
    const imageChanges = changes.map(entry => {
      const pathParts = entry.path.split('.');
      const isTarget = pathParts.includes('var-imgs') || pathParts.includes('color-img');
      return isTarget ? { entry, pathParts } : null;
    }).filter((item): item is { entry: Change; pathParts: string[] } => item !== null);

    imageChanges.forEach(({ entry, pathParts }) => {
      // console.log(entry, pathParts);

      const target = pathParts[2];
      if (target === 'var-imgs') {
        if (entry.op === 'add' || entry.op === 'replace') {
          const value = entry.val.length > 1 ? entry.val[1] : entry.val[0];

          const key = `${pathParts[1]}-${pathParts[pathParts.length - 1]}`;
          formData.append(key, (value as { blob: Blob }).blob);

          if (!generatedUUID) generatedUUID = GetRandomUUID();
        }
      } else {
        const value = entry.val[1];

        const key = `${pathParts[1]},`;
        formData.append(key, (value as { blob: Blob }).blob);

        if (!generatedUUID) generatedUUID = GetRandomUUID();
      }
    });

    if (generatedUUID) formData.append('uuid', generatedUUID);

    // console.log(generatedUUID);
    // console.log(formData);

    return formData
  }

  function GetRandomUUID() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: RFC4122 v4 UUID polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function ResolveVersionConflict() {
    const result: boolean = await (() => {
      return new Promise((resolve) => {
        setTopLayerIsActive(true, 'dialog', { title: 'Version Conflict', message: "A user edited this product while you were making your changes. Forcing submit could overwrite some of the recently changed data. Would you like to proceed?", trueButton: 'Force submit' }, resolve);
      });
    })();
    // console.log('force submit? ', result);

    if (!result) return;

    HandleUpload(true);
  }

  function FilterChanges(changes: Change[], varImgs: boolean): Change[] {
    let filteredChanges = structuredClone(changes);

    if (varImgs) filteredChanges = filteredChanges.filter(change => !change.path.includes('var-imgs'));

    filteredChanges = filteredChanges.filter(change => !change.path.includes('model-') || change.path.split('.').pop() === 'model-id'); // && !change.path.includes('model-id')

    // console.log(filteredChanges);

    return filteredChanges;
  }

  async function DeepCompare(obj1: object | string, obj2: object | string, path = '', changeCollector: Change[] = []) {
    let isEqual = true;

    if (obj1 === obj2) return true;

    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        if ((typeof obj1 !== "object" || obj1 === null) && (typeof obj2 !== "object" || obj2 === null)) {
          changeCollector.push({ path, op: 'update', val: [obj1, obj2] });
        }
        return false;
      }
      return true;
    }

    // color image
    if (path.split('.').pop() === 'color-img') {
      const item1 = obj1 as ImageObject;
      const item2 = obj2 as ImageObject;

      if (item1 && item2) {
        if (item2.blob) changeCollector.push({ path, op: 'update', val: [item1, item2] });
        else {
          const equal = await DeepCompare(item1, item2, path, changeCollector);
          if (!equal) isEqual = false;
        }
      } else if (!item1 && item2) {
        // Added
        changeCollector.push({ path, op: 'add', val: [item2] });
        isEqual = false;
      }

      return isEqual;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      const pathSplit = path.split('.');
      if (pathSplit.at(-1) === 'stock_batches') {
        const maxLen = Math.max(obj1.length, obj2.length);

        for (let i = 0; i < maxLen; i++) {
          const item1: SizeStockBatch = obj1[i];
          const item2: SizeStockBatch = obj2[i];

          if (item1 && item2) {
            // Update
            const equal = await DeepCompare(item1, item2, `${path}.${item2.batch_id}`, changeCollector);
            if (!equal) isEqual = false;
          } else if (item1 && !item2) {
            // Removed
            changeCollector.push({ path: `${path}.${item1.batch_id}`, op: 'remove', val: [item1] });
            isEqual = false;
          } else if (!item1 && item2) {
            // Added
            changeCollector.push({ path: `${path}.${item2.batch_id ?? '_nb'}`, op: 'add', val: [item2] });
            isEqual = false;
          }
        }

        return isEqual;
      } else {
        if (pathSplit.at(-1) === 'var-imgs') {
          // console.log("diff in var images", path);

          const maxLen = Math.max(obj1.length, obj2.length);

          for (let i = 0; i < maxLen; i++) {
            const item1 = obj1[i];
            const item2 = obj2[i];

            if (item1 && item2) {
              if (item2.blob) {
                changeCollector.push({ path: `${path}.${i}`, op: 'replace', val: [item1, item2] });
                isEqual = false;
              }
              else {
                const equal = await DeepCompare(item1, item2, `${path}.${i}`, changeCollector);
                if (!equal) isEqual = false;
              }
            } else if (item1 && !item2) {
              // Removed
              changeCollector.push({ path: `${path}.${i}`, op: 'remove', val: [item1] });
              isEqual = false;
            } else if (!item1 && item2) {
              // Added
              changeCollector.push({ path: `${path}.${i}`, op: 'add', val: [item2] });
              isEqual = false;
            }
          }

          return isEqual;
        } else {
          const removedItems = obj1.filter(item => !obj2.includes(item));
          const addedItems = obj2.filter(item => !obj1.includes(item));

          for (const item of removedItems) {
            changeCollector.push({ path, op: 'remove', val: [item] });
          }

          for (const item of addedItems) {
            changeCollector.push({ path, op: 'add', val: [item] });
          }

          return removedItems.length === 0 && addedItems.length === 0;
        }
      }
    }

    if (path.split('.').pop() === 'new_color') {
      changeCollector.push({ path, op: 'update', val: [obj1, obj2] });
      return false;
    }

    // Only go over keys1 first, then keys2, in sequence
    const keys1 = Object.keys(obj1);
    for (const key of keys1) {
      const fullPath = path ? `${path}.${key}` : key;

      if (!(key in obj2)) {
        changeCollector.push({ path: fullPath, op: 'remove', val: [(obj1 as Record<string, ChangeVal>)[key]] });
        isEqual = false;
      } else {
        const equal = await DeepCompare((obj1 as Record<string, object>)[key], (obj2 as Record<string, object>)[key], fullPath, changeCollector);
        if (!equal) isEqual = false;
      }
    }

    const keys2 = Object.keys(obj2);
    for (const key of keys2) {
      const fullPath = path ? `${path}.${key}` : key;

      if (!(key in obj1)) {
        changeCollector.push({ path: fullPath, op: 'add', val: [(obj2 as Record<string, ChangeVal>)[key]] });
        isEqual = false;
      }
    }

    return isEqual;
  }

  function CheckStepsValidity() {
    const result = Object.values(stepsValidityObj).every(Boolean);
    // console.log('StepsValidity result: ' + result);
    return result;
  }

  return (
    <>
      <div className="ep-step-five-container" inert={loading}>
        <div className="ep-review-changes" style={{ padding: changes.length < 1 ? 'clamp(27px, 3%, 38px) 38px' : '0% clamp(18px, 5%, 30px)' }}>
          <p className="ep-review-changes-title">review changes</p>
          {changes.length < 1 ?
            <p>No modifications were made to this product!</p>
            :
            <>
              {changes.filter(change => !change.path.startsWith('vars') && !change.path.startsWith('search-tags') && !change.path.startsWith('sizes')).map((entry, id) => {
                return <SimpleChangeCard key={id} op={entry.op} path={entry.path} val={entry.val} />
              })}
              {(varsChangesObj && Object.entries(varsChangesObj).length > 0) && <NestedChangesCard changesObj={varsChangesObj} varImgsChangesObj={varImgsChangesObj} varModelChangesObj={varModelChangesObj} changesFor={'vars'} />}
              {(sizesChangesObj && Object.entries(sizesChangesObj).length > 0) && <NestedChangesCard changesObj={sizesChangesObj} changesFor={'sizes'} />}
              {(changes.filter(change => change.path.startsWith('search-tags')).length > 0 && <SearchTagsChangeCard changes={changes} />)}
            </>
          }
        </div>
        {(!allStepsValid) &&
          <div className="ep-error-line-container">
            <EditProductErrorLine errorMessage={"There seems to be some errors on one or more of the entered values!"} />
          </div>
        }
        <button className="ep-save-changes-button" disabled={!submitIsValid || !allStepsValid || loading} onClick={() => HandleUpload()}>
          <img src={ImageUrl('ui-images/checkmark-icon.svg')} alt='' />
          <p>{edit ? 'save changes' : 'add product'}</p>
        </button>
        {loading &&
          <SimpleLoading style={{ position: 'initial', transform: 'translate(0%, 500%)', opacity: '100%' }} endAnim={false} />
        }
      </div>
    </>
  );
}
//                                     ------------------------     Step  Five     ------------------------
interface NestedChangeCardProps {
  changesObj: Record<string, Change[]>;
  varImgsChangesObj?: Record<string, Record<ChangeOp, number>>;
  varModelChangesObj?: Record<string, Record<string, ChangeVal[]>>;
  changesFor: string;
}

function NestedChangesCard({ changesObj, varImgsChangesObj, varModelChangesObj, changesFor }: NestedChangeCardProps) {
  const [selectedVar, setSelectedVar] = useState(Object.keys(changesObj)[0]);
  const [isExtended, setIsExtended] = useState(false);
  const [cardHeight, setCardHeight] = useState(50);
  const cardContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    RecalculateHeight();
    // console.log(selectedVar);
  }, [selectedVar]);

  function RecalculateHeight() {
    setCardHeight(cardContainer.current?.scrollHeight ?? 50);
  }

  return (
    <div className="ep-extended-change-card" ref={cardContainer} onClick={() => setIsExtended(ext => !ext)} style={{ maxHeight: isExtended ? `${cardHeight}px` : "60px" }} >
      <div className="ep-simple-change-card">
        <p>{`Modified ${Object.keys(changesObj).length} ${changesFor === 'vars' ? (Object.keys(changesObj).length > 1 ? 'variants' : 'variant') : (Object.keys(changesObj).length > 1 ? 'sizes measurements' : 'size measurements')}`}</p>
        <img className="button-icon" src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' data-isextended={isExtended.toString()} />
      </div>
      <div className="ep-modified-vars-bar">
        {Object.keys(changesObj).map((varName, id) => (
          <div key={id} className="ep-modif-var-button-wrapper" data-isactive={(selectedVar === varName).toString()}>
            <button onClick={(e) => (e.stopPropagation(), setSelectedVar(varName))}>{varName.startsWith('_') ? 'Unassigned' : varName}</button>
            <hr />
          </div>
        ))}
      </div>
      <div className="ep-changes-container">
        {Object.entries(changesObj[selectedVar]).map(([, entry], id) => {
          if (entry.path.split('.').filter(level => level === 'var-imgs' || level === 'model').length === 0) {
            return <SimpleChangeCard key={id} op={entry.op} path={entry.path} val={entry.val} />
          }
        })}
        {(changesFor === 'vars' && varImgsChangesObj && varImgsChangesObj[selectedVar]) && Object.entries(varImgsChangesObj[selectedVar])?.map(([op, val], id) => {
          if (val > 0) {
            return <SimpleChangeCard key={id} op={op as ChangeOp} path={`vars.${selectedVar}.var-imgs`} val={[val]} />
          }
        })}
        {(changesFor === 'vars' && varModelChangesObj && varModelChangesObj[selectedVar]) &&
          <SimpleChangeCard op={'update'} path={`${selectedVar} > model`} val={[`${varModelChangesObj[selectedVar]['model-f-name'][0]} ${varModelChangesObj[selectedVar]['model-l-name'][0]}`, `${varModelChangesObj[selectedVar]['model-f-name'][1]} ${varModelChangesObj[selectedVar]['model-l-name'][1]}`]} />
        }
      </div>
    </div>
  )
}

function SearchTagsChangeCard({ changes }: { changes: Change[] }) {
  const [isExtended, setIsExtended] = useState(false);
  const cardContainer = useRef<HTMLDivElement | null>(null);

  return (
    <div className="ep-extended-change-card" ref={cardContainer} onClick={() => setIsExtended(ext => !ext)} style={{ maxHeight: isExtended ? `${cardContainer.current?.scrollHeight}px` : "50px" }} >
      <div className="ep-simple-change-card">
        <p>{"Modified product's search tags"}</p>
        <img className="button-icon" src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' data-isextended={isExtended.toString()} />
      </div>
      <div className="ep-changes-container">
        {changes.filter(change => change.path.startsWith('search-tags')).map((entry, id) => {
          return <SimpleChangeCard key={id} op={entry.op} path={'tag'} val={entry.val} />
        })}
      </div>
    </div>
  )
}

function SimpleChangeCard({ op, path, val }: { op: ChangeOp; path: string; val: [ChangeVal] | [ChangeVal, ChangeVal]; }) {
  const { productDic } = useProductEdit();

  const opNames = {
    'add': 'Added new',
    'update': 'Updated',
    'remove': 'Removed',
    'replace': 'Replaced'
  }
  const opImages = {
    'add': 'add-icon.svg',
    'update': 'refresh-icon.svg',
    'remove': 'dash-icon.svg',
    'replace': 'switch-icon.svg'
  }

  function PathFormatter(path: string) {
    if (!path) return '';

    let p;
    const pathLevelsArr = path?.split('.');

    if (pathLevelsArr.includes('varSizesQuantity')) {
      for (let i = pathLevelsArr.indexOf('varSizesQuantity'); i < pathLevelsArr.length; i++) {
        const x = pathLevelsArr[i] === 'varSizesQuantity' ? 'Stock' : pathLevelsArr[i];
        p = !p ? x : p + ' > ' + x;
      }
      p = p?.replace(/[_-]/g, ' ');
      // console.warn(p);
    } else if (pathLevelsArr.includes('sizes')) {
      const sizesArr = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      for (let i = pathLevelsArr.indexOf('sizes'); i < pathLevelsArr.length; i++) {
        if (pathLevelsArr[i] === 'sizes' || sizesArr.filter((size) => size === pathLevelsArr[i]).length > 0) continue;

        const x = (() => {
          if (pathLevelsArr[i].startsWith('p-')) {
            // do something
            return pathLevelsArr[i].replace('p-', 'product ');
          } else if (pathLevelsArr[i].startsWith('b-')) {
            // do something else
            return pathLevelsArr[i].replace('b-', 'body ');
          } else if (pathLevelsArr[i].startsWith('ext-')) {
            // another branch
            return pathLevelsArr[i].replace('ext-p-', 'product ');
          } else {
            return pathLevelsArr[i]
          }
        })();
        p = !p ? x : p + ' > ' + x;
      }
      p = p?.replace(/[_-]/g, ' ');
    } else if (pathLevelsArr.includes('var-imgs')) {
      for (let i = pathLevelsArr.indexOf('var-imgs') - 1; i < pathLevelsArr.length; i++) {
        const x = pathLevelsArr[i] === 'var-imgs' ? 'images' : pathLevelsArr[i];
        p = !p ? x : p + ' > ' + x;
      }
      p = p?.replace(/[_-]/g, ' ');
    } else if (pathLevelsArr.includes('new_color')) {
      p = path.replace('new_', '').replace(/\./g, ' > ');
    }

    return p ? p : path.replace(/[_-]/g, ' ').replace(/\./g, ' > ')
  }

  const valueChangeFormatter = (() => {
    let valueString = '';

    if (path.includes('new_color')) {
      const value = val[1] as newColorType;
      const x = value.name;
      const originalVarName = productDic?.vars[path.split('.').at(-2) as ColorKey]["color-name"];
      valueString = originalVarName + '  ➤  ' + x;
    } else {
      if (val.length > 1) {
        valueString = `${typeof val[0] === "object" ? (val[0] === null ? 'Unassigned' : '') : val[0]}  ➤  ${typeof val[1] === "object" ? (val[1] === null ? 'Unassigned' : '') : val[1]}`
      } else {
        valueString = ` ${typeof val[0] === "object" ? '' : val[0]}`
      }
    }

    return valueString
  })();

  return (
    <div className="ep-simple-change-card" data-op={op}>
      <img className="ep-simple-change-card-icon" src={ImageUrl(`ui-images/${opImages[op]}`)} alt='' />
      {path === 'tag' ?
        <p className="ep-simple-change-card-title">
          {opNames[op] + ' tag '}
          <span className="ep-simple-change-focus-card">{typeof val[0] !== 'object' ? val[0] : 'object'}</span>
        </p>
        :
        <p className="ep-simple-change-card-title">
          {opNames[op] + ' '}
          <span className="ep-simple-change-focus-card">{PathFormatter(path)}</span>
          {val.length > 1 && <span>:  </span>}
          {valueChangeFormatter}
        </p>
      }

    </div>
  )
}
//                                     ------------------------     Step  Four     ------------------------
interface TagButtonProps {
  autoTags: string[];
  manualTags: string[];
  removedTags: string[];
  tagFor: string;
  tagName: string;
  interactable: boolean;
}

function TagButton({ autoTags, manualTags, removedTags, tagFor, tagName, interactable }: TagButtonProps) {
  const { productDic, updateProductDic } = useProductEdit();
  const [triggerRemove] = useState(false); // setTriggerRemove

  function OtherImageSelector(tag: string) {
    let imgName;
    if (tagFor === 'auto') {
      return undefined
    } else if (tagFor === 'manual') {
      imgName = 'ui-images/add-icon.svg'
    } else if (tagFor === 'removed') {
      imgName = 'ui-images/reverse-arrow-icon.svg'
    } else {
      if (autoTags.includes(tag)) {
        imgName = 'ui-images/checkmark-icon.svg'
      } else if (removedTags.includes(tag)) {
        imgName = 'ui-images/reverse-arrow-icon.svg'
      } else {
        imgName = 'ui-images/add-icon.svg'
      }
    }
    return imgName ? ImageUrl(imgName) : undefined;
  }

  function ToggleTag() {
    if (autoTags.includes(tagName)) return;

    if (productDic?.['search-tags'].includes(tagName)) {
      // console.log('has');
      // console.warn(tagName);
      // console.log(productDic['search-tags'].toString());

      updateProductDic(draft => {
        if (!draft) return;

        draft['search-tags'].splice(draft['search-tags'].indexOf(tagName), 1);
      });
    } else {
      updateProductDic(draft => {
        if (!draft) return;

        draft['search-tags'].push(tagName);
      });
    }
  }

  function TagForSelector(tag: string) {
    if (autoTags.includes(tag)) return 'auto'
    else if (removedTags.includes(tag)) return 'removed'
    else if (manualTags.includes(tag)) return 'manual'
    else return 'other'
  }

  return (
    <button className="ep-tag-button" data-tagfor={TagForSelector(tagName)} data-isremoved={triggerRemove.toString()} data-isadded={tagFor === 'other' && manualTags.includes(tagName) ? 'true' : 'false'} disabled={!interactable} onClick={(e) => { e.stopPropagation(); ToggleTag() }}>
      <p>{tagName}</p>
      {interactable &&
        <div data-tagfor={tagFor}>
          <img className="button-icon" src={OtherImageSelector(tagName)} alt='' />
        </div>
      }
    </button>
  )
}
//                                     ------------------------     Step Three     ------------------------
function EditProductSizeInputField({ inputFor, activeSize, setPartsValidity }: { inputFor: keyof SizeMeasurements; activeSize: sizeKey; setPartsValidity: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>> | undefined>>; }) {
  const { productDic, updateProductDic } = useProductEdit();
  const [inputValue, setInputValue] = useState<string>(productDic?.sizes[activeSize][inputFor] ?? '');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputValue((productDic?.sizes[activeSize]?.[inputFor])?.replace(/[\s]/g, '').replace('-', ' - ') ?? ''); // useState(productDic.sizes[activeSize]?.[inputFor] ?? '');
  }, [activeSize]);

  useEffect(() => {
    // console.log('its happening here');
    updateProductDic(draft => {
      if (!draft) return;

      draft.sizes[activeSize][inputFor] = inputValue ? inputValue.replace(/[\s]/g, '') : null;
    });

    const valArray = inputValue.replace(/[\s]/g, '').split('-');

    const firstValue = valArray[0] ? parseFloat(valArray[0]) : null;
    const secondValue = valArray[1] ? parseFloat(valArray[1]) : null;

    const validCheck = () => {
      const validityCheck = ValidateValues(valArray);

      if (validityCheck === false) return false;
      if (secondValue && firstValue) { if (secondValue > firstValue) { return true } else return false } else return validityCheck
    };

    setIsValid(validCheck());
    setPartsValidity((partsVal) => { return { ...partsVal, [activeSize]: { ...partsVal?.[activeSize], [inputFor]: validCheck() } } });
  }, [inputValue]);

  function HandleValueChange(value: string) {
    const val = value.replace(/[^\d-.]/g, "");
    const valArray = val.split('-');

    // console.log(valArray);

    if (valArray.length > 2) return;

    const validCheck = ValidateValues(valArray);

    setIsValid(validCheck);
    setPartsValidity((partsVal) => { return { ...partsVal, [activeSize]: { ...partsVal?.[activeSize], [inputFor]: validCheck } } });

    setInputValue(val);
  }

  function ValidateValues(valArray: string[]) {
    let isValid = true;

    for (let i = 0; i < valArray.length; i++) {
      if (valArray[i] === '' || valArray[i] === null) continue;

      if (!valArray[i].match(/^[1-9]\d*(\.\d+)?$/)) {
        isValid = false;
        // console.log('the value ' + valArray[i] + 'is: ' + isValid);
        break;
      }
    }

    return isValid;
  }

  function HandleFocusIn() {
    setInputValue(inputValue.replace(/[\s]/g, ''));
  }

  function HandleFocusOut() {
    const [firstValue, secondValue] = inputValue.replace(/\s/g, '').split('-');

    const format = (val?: string) => {
      const num = Number(val);
      return isNaN(num) || (num === 0 && secondValue === undefined) ? '' : (Math.round(num * 10) / 10).toString();
    };

    const string = `${format(firstValue)}${secondValue && !isNaN(Number(secondValue)) ? ' - ' : ''}${format(secondValue)}`;
    // console.log('firstValue: ' + firstValue + ' - secondValue: ' + secondValue);

    setInputValue(string);
  }

  return (
    <div className="ep-general-info-select-section">
      <button data-isfilled={inputValue === '' ? 'false' : 'true'} onClick={() => inputRef.current?.focus()}>
        <p className="ep-input-title" data-isvalid={isValid.toString()}>{inputFor.replace('ext-p-', '').replace('-', ' ')}</p>
        <input className="ep-input-value" type="text" value={inputValue} ref={inputRef} placeholder={inputFor.replace('ext-p-', 'Product ').replace('-', ' ')} onChange={(e) => HandleValueChange(e.target.value)} onFocus={HandleFocusIn} onBlur={HandleFocusOut} />
        <img className='button-icon' src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
      </button>
    </div>
  )
}

interface SizePopupContainerProps {
  partID: keyof SizeMeasurements;
  activeSize: sizeKey;
  isVisible: boolean;
  selectedPart: string | null;
  setSelectedPart: React.Dispatch<React.SetStateAction<string | null>>;
  setPartsValidity: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>> | undefined>>;
  buttonRef: RefObject<HTMLDivElement | null>;
  buttonPos: string;
}

function SizePopupContainer({ partID, activeSize, isVisible, selectedPart, setSelectedPart, setPartsValidity, buttonRef, buttonPos }: SizePopupContainerProps) {
  const { productDic, updateProductDic } = useProductEdit();
  const [showPopup, setShowPopup] = useState(false);
  const [inputOneValue, setInputOneValue] = useState<{ value: string; isValid: boolean }>(EvaluateValue(productDic?.sizes[activeSize]?.[partID]?.split('-')[0] ?? ''));
  const [inputTwoValue, setInputTwoValue] = useState<{ value: string; isValid: boolean }>(EvaluateValue(productDic?.sizes[activeSize]?.[partID]?.split('-')[1] ?? ''));
  const popupContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputOneValue(EvaluateValue(productDic?.sizes[activeSize]?.[partID]?.split('-')[0] ?? ''));
    setInputTwoValue(EvaluateValue(productDic?.sizes[activeSize]?.[partID]?.split('-')[1] ?? ''));
  }, [activeSize]);

  useEffect(() => {
    let delay: NodeJS.Timeout;

    if (selectedPart === partID) setShowPopup(true);
    else {
      if (!popupContainerRef.current) return;

      popupContainerRef.current.setAttribute('data-isactive', 'false');
      delay = setTimeout(() => setShowPopup(false), 200);
    }

    return () => clearTimeout(delay);
  }, [selectedPart]);

  useEffect(() => {
    const valString = `${inputOneValue.value ? inputOneValue.value : ''}${inputTwoValue.value === '' ? '' : '-'}${inputTwoValue.value === '' ? '' : inputTwoValue.value}`;
    updateProductDic(draft => {
      if (!draft) return;

      draft.sizes[activeSize][partID] = valString === '' ? null : valString;
    });

    const firstValue = inputOneValue.value ? parseFloat(parseFloat(inputOneValue.value)?.toFixed(1)) : null;
    const secondValue = inputTwoValue.value ? parseFloat(parseFloat(inputTwoValue.value)?.toFixed(1)) : null;

    if (secondValue && firstValue) setPartsValidity((partsVal) => { return { ...partsVal, [activeSize]: { ...partsVal?.[activeSize], [partID]: ((secondValue > firstValue) && inputOneValue.value !== '' && inputOneValue.isValid && inputTwoValue.isValid ? true : false) } } });
    else setPartsValidity((partsVal) => { return { ...partsVal, [activeSize]: { ...partsVal?.[activeSize], [partID]: (inputOneValue.isValid && inputTwoValue.isValid ? true : false) } } });

  }, [inputOneValue, inputTwoValue]);

  function EvaluateValue(value: string): { value: string; isValid: boolean } {
    if (value == null || value === '') return { value: '', isValid: true };

    const isValid = /^[1-9]\d*(\.\d+)?$/.test(value);

    return { value, isValid };
  }

  function HandleFocusOut(inputFor: string) {
    const roundOrKeep = (val: string): string => {
      const num = Number(val);
      return isNaN(num) || val === '' ? val : (Math.round(num * 10) / 10).toString();
    };

    const updateValue = (setValue: React.Dispatch<React.SetStateAction<{ value: string; isValid: boolean }>>, rawValue: string) => {
      const rounded = roundOrKeep(rawValue);
      setValue(EvaluateValue(rounded));
    };

    if (inputFor === 'one') updateValue(setInputOneValue, inputOneValue.value);
    else updateValue(setInputTwoValue, inputTwoValue.value);

  }

  return (
    <div className="ep-size-parent-container" ref={selectedPart === partID ? buttonRef : null} style={{ transform: buttonPos, opacity: isVisible ? '100%' : '0%' }}> {/* transitionDuration: '0.3s' */}
      {showPopup &&
        <div className="ep-size-popup-container" ref={showPopup ? popupContainerRef : null} data-isactive={selectedPart === partID}>
          <div className="ep-size-popup-top-bar">
            <p>{partID.startsWith('b-', 0) ? partID.replace('b-', 'body ') : partID.replace('p-', 'product ')}</p>
          </div>
          <div className="ep-general-info-input-sections-wrapper">
            <div className="ep-general-info-input-section" data-isfilled={inputOneValue.value === '' ? 'false' : 'true'} data-isvalid={inputOneValue.isValid.toString()}>
              <input type="text" inputMode="decimal" value={inputOneValue.value} onChange={(e) => setInputOneValue(EvaluateValue((e.target.value).replace(/[^\d.]/g, '')))} onBlur={() => HandleFocusOut('one')} /> {/* onFocus={HandleFocusIn} onBlur={HandleFocusOut} */}
            </div>
            <p>-</p>
            <div className="ep-general-info-input-section" data-isfilled={inputTwoValue.value === '' ? 'false' : 'true'} data-isvalid={inputTwoValue.isValid.toString()}>
              <input type="text" inputMode="decimal" value={inputTwoValue.value} onChange={(e) => setInputTwoValue(EvaluateValue((e.target.value).replace(/[^\d.]/g, '')))} onBlur={() => HandleFocusOut('two')} />
            </div>
          </div>
        </div>
      }
      <button data-isfilled={inputOneValue.value === '' ? 'false' : 'true'} data-isvisible={isVisible} data-isactive={selectedPart === partID ? 'true' : 'false'} onClick={() => { if (!isVisible) return; if (selectedPart !== partID) { setSelectedPart(partID); } }}>
        <div></div>
      </button>
    </div>
  )
}

interface ModelSizeVectorPartsProps {
  selectedPart: string | null;
  activeSize: sizeKey;
  activeTarget: string;
  partsValidity: Record<string, Record<string, boolean>> | undefined;
}
function ModelSizeVectorParts({ selectedPart, activeSize, activeTarget, partsValidity }: ModelSizeVectorPartsProps) {
  const { theme } = useTheme();
  const [defaultColor, setDefaultColor] = useState(theme === 'dark' ? '#e7e7e7' : '#555555');
  const [activeColor, setActiveColor] = useState(theme === 'dark' ? '#9058bb' : '#c67cff');
  const invalidColor = theme === 'dark' ? '#d73f34' : '#ff5c5c';;

  // useEffect(() => {
  //     console.log(partsValidity);
  // }, [partsValidity]);

  useEffect(() => {
    setDefaultColor(theme === 'dark' ? '#ffffff' : '#231F20');
    setActiveColor(theme === 'dark' ? '#9058bb' : '#c67cff');
  }, [theme]);

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 1024" enableBackground={"new 0 0 512 1024"}>
        <g id="dress-full">
          <path className="model-size-vector-part" data-isactive={(activeTarget === 'product' && selectedPart === null) ? 'true' : 'false'} style={{ fill: (activeTarget === 'product' && selectedPart === null) ? activeColor : defaultColor }} d="M377,940.4c-6.7-7.9-13.4-15.9-20-23.9
                c-1.8-2.2-3.4-4.8-4.6-7.4c-2-4.3-2.5-8.7,0.1-13.1c2.1-3.6,1.5-7.4-0.4-11c-1.1-2.1-2.2-4.3-3.4-6.4c-3.8-6.6-6.6-12.3-10.6-18.8
                c-5.6-9.2-14-22-17-32.7c-0.4-1.3,0.6-1.9,2.7-3.7c1.4-1.2,2.9-2.5,4.4-3.7c5-4.2,5.3-6.2,2.3-11.8c-0.3-0.5-0.5-1-0.9-1.5
                c-5.3-8.5-8.4-17.9-11.1-27.5c-1-3.5-2.4-6.9-3.5-10.4c-1.9-5.8-4.5-11.6-5.6-17.6c-2-11.1-3.5-22.4-4.6-33.6
                c-1.1-11.3-1.6-22.6-2.2-33.9c-0.6-11.6-1.3-23.1-1.7-34.7c-0.3-9.6,0-19.1-0.3-28.7c-0.4-11.5-1.7-22.9-1.8-34.4
                c-0.2-16,0.4-31.9,3.5-47.8c2.2-11.7,3.7-23.5,4.9-35.4c1.4-13.5,0.6-26.9-0.8-40.4c-1.8-17.7-4.1-35.2-7.2-52.7
                c-1.9-10.6-3-21.3-2.8-32c0.1-8.3-1.6-16.4-3.5-24.4c-2.2-9.2-3.7-18.5-1.3-27.9c1.9-7.7,3.9-15.3,5.9-23
                c2.1-8.1,4.5-16.2,6.2-24.4c2.2-10.7,4.1-21.6,5.7-32.4c0.7-4.9,0.6-9.9,0.2-14.8c-0.5-5.7-2.1-11.9-2.8-17.6
                c-0.8-6.3-1.1-11.9-1.2-18.2c-0.2-9.8-0.7-19.3-0.7-29.1c0.2,0.4,0.6,24,1.2,36.6c0.3,6,1,12,2,18c0.8,4.5,1.6,6.6,2.1,15.7
                c0.1,3-0.1,5.1,0.3,8.8c1,9.6,2.5,18.4,4.4,27.8c0.7,3.3,1.8,8,2.9,11c7.1-3.9,16.9-5.1,27.2-6.5c-0.2-1.5-1.2-5.4-1.4-6.7
                c-2.8-13.3-5.8-23.7-7.8-37.1c-2.1-13.6-2.8-27.3-3.8-41c-0.4-5.7-1-11.3-3.1-16.6c-2.4-6.2-5.4-13.2-12-16
                c-2.7-1.1-5.7-1.7-8.6-1.9c-4.6-0.3-10,0-14.8,0c-2,3.7-3.7,8.1-6.1,11.6c-7.8,11.3-16.6,22.7-24.5,33.9c-2.3,3.3-6.1,8.7-7.7,12.4
                c-1.4,3.2-4.1,20.7-4.4,22.1c-0.2,1.3-0.5,2.9-0.7,2.9c-0.1-0.2-0.3-0.4-0.3-0.7c-1-5.6-3-10.3-4.8-15.4c-2-5.6-3.5-11.3-7.5-16
                c-3.2-3.7-6.6-7.3-9.7-11.1c-7.4-9.1-14.6-18.3-21.9-27.5c-0.9-1.1-2.9-4-3.4-4.6c-3.3,2.6-8.4,3-12.9,3
                c-6.1-0.1-11.5,1.8-16.4,4.7c-3.5,2.1-7.4,6.7-9,10.6c-4.4,10.4-3.4,21.1-2,31.9c1.9,14.9,3.7,29.9,5.5,44.8
                c1.5,11.8,3.1,23.6,4.5,35.5c0.2,1.6,0.2,3.2,0.7,4.7c7.2-1,15.9-2.1,22.7-3.1c-0.1-1.7-0.2-2.9-0.4-4.2c-1.4-10-2.6-20.1-4.4-30.1
                c-1.6-8.9-2.4-17.8-1.7-26.8c0.1-0.9,3.7-48.9,2.1-62.3c2,21.3-2.3,68.6-2,72.9c0.1,2.5,0.4,7.6,2.1,15.8
                c5.1,25.7,8.2,34.4,12.2,51.6c2,8.5,0.9,16.7-5.1,24.4c-7.6,9.7-11.2,20.4-16.1,31.6c-4.7,10.6-9,21.5-13.7,32
                c-5,11-7.9,15.7-9.8,27.7c-2.8,17.2-2.9,40.9-2.4,58.1c0.1,2.7,0.4,5.3,0.6,8c0.4,7,1.1,14,1.2,20.9c0.1,8.7-0.3,17.5-0.4,26.2
                c0,7.4,0.3,14.8,0.2,22.2c-0.2,13.9-0.4,23.8-0.8,37.7c-0.1,3.2-0.3,10.4-0.9,13.4c-3.5,16.2-6.9,32.4-10.8,48.5
                c-2.9,12.1-6.2,24-9.7,35.9c-4.4,14.8-6.7,30.2-13.1,44.5c-3.6,8.2-5.7,17-8.9,25.4c-1.6,4.1-4.2,7.7-6.2,11.7
                c-1.6,3.1-0.2,5.3,2.4,7.7c1.6,1.5,3.4,3,5.1,4.4c5.5,4.5,6.8,10,4.2,17c-0.5,1.2-0.7,2.6-1,3.9c-2.9,11.5-5.6,23-8.6,34.4
                c-1.1,4-2.9,7.8-4.2,11.7c-2.7,7.8-1.9,10.5,4.2,14.8c1.2,0.9,3.4,1.8,4.5,2.8c2.6,2.4,4,6.9,3.3,10.8c-0.5,2.8-1.3,5.7-2.3,8.4
                c-3.9,9.9-11.5,18.3-17.4,27.1c-4.1,6-8.1,12-11.9,18.2c-2.2,3.6,0.4,4.9,4,7c7,4.2,14.6,7.2,22.3,9.8c13.6,4.7,27,9.9,41.4,11.5
                c5.6,0.6,11.3,1.5,16.9,1c12.6-1.2,24.5-5.2,36.2-9.8c8.7-3.5,17.2-7.7,25.8-11.3c4.5-1.9,9.1-3.8,13.8-5c5.9-1.5,11.9-1.2,18,0.2
                c9.3,2,18.8,3.1,28.3,4.5c3.7,0.5,7.4,0.9,11.1-0.1c12.4-3.3,25.1-4.1,37.8-4.1c7.5,0,15,0.5,22.4,0.5c4,0,8-0.5,11.8-1.4
                    C379.5,945.5,379.8,943.7,377,940.4z"/>
        </g>
        <g id="body-full">
          <path className="model-size-vector-part" data-isactive={(activeTarget === 'body' && selectedPart === null) ? 'true' : 'false'} style={{ fill: (activeTarget === 'body' && selectedPart === null) ? activeColor : defaultColor }} d="M158.1,501.5c0.4,1.5,0.3,2.9-1.3,3.5
                c-0.2,0.1-0.4,0-0.5-0.2c-0.5-0.9-1-1.8-1.4-2.8c-0.7-1.5-1.4-2.8-2.4-4.1c-1-1.4-1.9-2.9-2.7-4.5c-0.7-1.3-1.5-2.7-2-4.1l-0.2-0.5
                c0.1-1.7,0-3.5,0.1-5.2c0-0.3,0-0.5,0.1-0.8c0.9,0.7,4.9,8.8,6.2,10.6c0.7,1.2,1.3,2.3,1.9,3.5C156.7,498.5,157.6,500,158.1,501.5z
                M404.3,471.1c-1.6-2.4-3.6-4.4-4.8-7c0,0-0.1-0.1-0.1-0.1c-1.1-0.2-2.8-0.4-3.7-0.2c-0.1,0-0.2,0.2-0.1,0.3c1.5,1.8,3,3.4,4.1,5.1
                c1.4,2.1,2.6,4,4.1,6.1c0.3,0.4,1.4,1.5,3.4,1.1c0.2,0,0.3-0.3,0.2-0.5c-0.4-0.9-1.1-1.5-1.5-2.3
                C405.8,473.3,404.7,471.7,404.3,471.1z M416.6,481c0.2,0.3-0.4,0.6-0.8,0.6c-1.1,0-2.7-0.5-3.4-1.1c-1.2-1-1.6-1.6-2.6-2.9
                c-0.8-1-4.3-6.4-4.8-7c-1.5-2.2-3.5-4.1-4.7-6.5c1,0.3,4.3,1.8,5,2.1c0.1,0.1,4.4,5.3,5.2,6.5c0.8,1.2,2.4,3.4,3.3,4.6
                c0.8,1.1,0.6,1,1.4,2C415.5,479.8,416.2,480.5,416.6,481z M419.9,477.9c0.7,1.3,1.9,2.4,2.4,3.3c0.1,0.2,0.2,0.4-0.1,0.6
                c-1.5,0.7-2.6,0.4-4.1-0.4c-0.3-0.2-0.6-0.4-0.9-0.7c-1.2-1.4-2-2.6-3.3-4.2c-1.7-2.3-3-4.9-4.8-7.1c-0.8-0.9-1.7-1.7-2.5-2.5
                c0.4,0,3.4,1,6.4,0.5C413.7,467.8,417.5,473.7,419.9,477.9z M156.4,506.9c0.1,1.5-0.2,3.2-1.9,4c-0.3,0.1-0.6,0.1-0.8-0.2
                c-1.1-1.9-1.9-4.3-3.1-6.1c-0.9-1.4-2-3.1-3.1-4.6c-0.5-0.6-0.9-1.3-1.2-2.1c-0.3-0.7-0.9-2.3-0.9-2.4c1.2-1.4,1.8-3.3,2-5.2
                c0.6,1.5,1.4,2.9,2.2,4.3c0.7,1.3,1.5,2.5,2.3,3.7c0.9,1.2,1.6,2.5,2.3,3.9c0.5,1.1,1.1,2.3,1.7,3.3
                C156.2,506,156.3,506.4,156.4,506.9z M152.7,490.4l-4.5-8.3l-0.3-0.3c0-0.4,0.1-0.8,0.3-1.2l1.3-2.8c0.3,0.2,2.3,5.6,3.4,7.4
                c0.9,1.7,2.1,3.2,3.1,4.9c0.8,1.5,0.9,2.9,0,4.2c-0.3,0.4-0.5,0.1-0.6,0C154.6,493.2,153.7,491.4,152.7,490.4z M424.3,469.8
                c-1.9-1.8-3.3-3.4-5.3-5.1c-4.5-4-9-7.9-13.5-11.8c-0.7-0.6-1.7-1-2.6-1.3c-4.4-1.4-8.8-3-13.3-4c-5.6-1.1-8.1-4.7-9.9-9.7
                c-3.8-10.6-5.1-21.7-6.4-32.7c-1.4-12.6-2.3-25.2-4-37.8c-2.8-22-8.4-43.3-17.5-63.6c-1.3-2.8-2.5-5.7-3.3-8.6
                c-2.8-11.5-5.5-23-7.8-34.6c-2.3-11.2-4.5-22.5-6.1-33.9c-1.4-9.7-2.2-19.5-2.8-29.3c-0.5-7.8-0.6-15.7-3.6-23.1
                c-4.6-11.6-10-16-21.7-16.6c-6-0.3-12-0.1-17.9-0.5c-8.9-0.4-17.5-6.5-21-13c-3-5.6-2.3-14.3-2.5-20.5c0-0.4,1.1-1.7,1.9-2.5
                c0.1-0.1,0.3-0.1,0.3,0.1c0,3.4-0.1,8.2,0,11.6c0.2,5.1,2,10.8,5.4,14.5c5.8,6.2,12.6,8.4,21.3,8c5.2-0.3,10.5-0.1,15.7,0.1
                c6.1,0.3,10.9,3.3,14.8,7.8c6.3,7.3,8.1,16.2,8.9,25.5c1.2,14.5,2.5,29,3.8,43.6c0.2,2.6,1.7,4.1,3.9,5.3
                c5.4,2.9,11.3,3.1,17.2,3.1c9.8,0.1,17.3-5.2,24.8-10.5c1.5-1.1,3-2.3,4.6-3.6c-4.4-2.2-8.5-4-12.5-6.2c-6.9-3.8-10-6.3-10.7-8.2
                c9,4,20.3,3.3,25.2-1.6c-2.3-1.6-5-3.2-7.3-4.8c-6.5-4.5-11.5-10.4-14.5-17.7c-1.9-4.9-3.6-12.6-5.4-17.5c-2.1-5.4-4.1-9-7.3-14.1
                c2.5,1.1,5.7,3.6,8.1,5.2c2.3,1.5,3.2,3.7,3.7,6.2c0.7,3.9,1.3,7.7,2.2,11.5c2.3,10.3,5.6,20.1,15.3,26.1c1,0.6,5.4,3.3,6.3,4
                c0.1-0.2-3.2-2.3-3.1-2.4c-6-3.9-9.2-9.4-10.1-16.4c-0.5-4-1.1-8.1-2.1-12c-1.4-5.5-3.6-10.7-7.7-15c-0.4-0.5-0.8-1-1-1.6
                c-3.2-8.9-8.8-15.5-16.9-19.7c-5.6-2.9-11.3-5.7-16.7-8.9c-5.7-3.4-9.8-8.3-11.3-14.9c-0.9-4-1.2-8.1-1.6-12.1
                c-1-9.9-3.2-19.4-10.7-26.7c-3.6-3.5-7.1-7.3-11.2-10.3c-7.1-5.2-11.9-11.7-14.5-20c-0.8-2.5-2.1-6.6-3.1-9.1
                c-3.7-9.1-8.2-17.5-17.9-21.7c-1.8-0.8-2.2-1-4-1.7c-0.4-0.1-2.3-0.7-2.7-0.7c-1.9-0.3-4.4-0.3-6.4,0.3c-2,0.7-3.2,1.4-4.8,2.1
                c-1.7-0.6-2.8-1-4.2-1.6c-9.3-3.5-21.8,3.1-27.5,12.1c-4.6,7.2-6.1,15.4-7.8,23.6c-2.4,12-6,23.6-10,35.2
                c-2.9,8.5-5.2,14.9-7.3,23.6c-2.3,9.7-1.7,21.6,3.4,30c4.9,8.1,13.1,13.6,22.5,14.7c0.6,0.1,2.1,0.2,2.9,0.2
                c-0.5,0.8-1.7,1.7-2.2,2c-1.9,1.4-3.7,2.8-5.8,3.9c-7,3.9-14.5,5.6-22.5,6.5c-10.4,1.1-18.7,6.2-22.3,16.9
                c-2.7,8.1-3.5,16.5-2.4,24.9c1,7.9,2.7,15.8,3.7,23.7c1.7,14.1,3.2,28.1,4.8,42.2c1.3,12.2,2.9,24.3,3.7,36.5
                c0.3,5.1-0.1,10.8-2,15.4c-6,14.5-10.8,29.4-14.5,44.6c-5.3,22.1-9.3,44.5-12.4,67c-0.9,6.4-2.5,12.7-4.1,19
                c-1.1,4.2-3.8,8-4.6,12.2c-0.8,4.2-0.9,8.2-0.7,12.6c0.1,2.7,2,8.4,2.8,11c1.7,5.7,2.8,8.9,4.6,14.6c0.2,0.6,0.4,3.4,2.2,2.1
                c3-3,1.5-6,0.9-9.3c-0.1-0.7-0.5-1.4-0.6-2.1c-0.3-1.7-0.2-3.1-0.6-4.3c-0.3,0.3-0.9,0.8-1.3,1c-0.8,0.4-1.7,0.6-2.4-0.1
                c-0.6-0.6-0.8-1.4-1-2.2c-0.2-0.9-0.2-1.7-0.3-2.6c-0.1-1.8-0.1-3.6,0.2-5.4c0.1-1,0.3-2.1,0.5-3.1c0.1-1.1,0.2-2.2,0.2-3.3
                c0.1-1.7,0.5-3.7-0.6-5.2c-0.3-0.4,0.3-0.7,0.6-0.4c1.1,1.5,0.7,3.7,0.7,5.4c0,1.1-0.1,2.3-0.2,3.4c-0.1,1.1-0.4,2.2-0.5,3.4
                c-0.2,1.7-0.2,3.5-0.1,5.2c0,0.9,0.1,1.7,0.3,2.6c0.1,0.6,0.4,1.4,0.9,1.7c0.9,0.5,2.1-0.6,2.6-1.1c2.2-2.2,2.3-5.7,2.3-8.6
                c0-1.5,0-3,0.2-4.5c0.2-1.2,0.5-2,1.1-3.2c0.2-0.4,0.4-0.7,0.6-1.1l3.6-8.3c1.3-3.9,2.8-7.9,1.6-12.1c-2.1-7.5,1-10.8,5-30.9
                c-2.4,12-2.4,19.8-2.6,23.5c-0.8,14.2,0,28.3,2.8,42.3c2.5,12.4,5.3,24.8,8.7,36.9c5.9,21.5,12.4,42.9,18.7,64.3
                c4.5,15.2,9.3,30.4,13.7,45.7c2.6,9,3.9,18.4,2.1,27.7c-1.4,7.2-3.5,14.4-5.6,21.5c-5.7,18.8-6.2,37.8-2,56.8
                c2.9,13.1,7,25.9,10.9,38.7c4.3,14.3,9.2,28.5,13.5,42.9c3.6,12.1,6.4,24.5,9.8,36.7c2,7.2,3.6,14.3,1.3,21.8
                c-0.7,2.2-0.5,4.8-0.5,7.2c0,1,0.1,2.1,0.6,2.9c3.5,6.6,3.8,13.9,4.3,21.1c1.1,18-0.9,35.8-3.7,53.5c-1.9,11.5,1.5,21.4,7.7,30.6
                c2.4,3.6,6.1,5.1,10.5,4.6c0.9-0.1,1.8,0,2.7,0.4c3,1.2,6,2,9,0c0.3-0.2,1.1-0.3,1.3-0.1c3.4,2.6,7,1.7,10.6,0.9
                c2.8-0.7,4.9-3.1,5-6c0.1-1.6-0.2-3.2-0.4-4.8c-0.3-3-0.9-6-0.8-8.9c0.1-5.2-0.4-10.3-1.9-15.3c-2.1-7.1-3.5-14.4-6.2-21.3
                c-1.5-3.7-1.5-3.3,1.9-3.3c1.7,0,3-1.8,4.5-2.8c0.6-0.4,1-1.2,1.6-1.5c2.2-0.9,3.1-2.8,3.6-5c0.3-1.6,0.7-3.1,1.3-4.6
                c2.7-6.6,3.7-13.5,2.4-20.6c-3-15.8-5.9-31.6-9.2-47.3c-1.4-6.7-1.5-13.1,0.3-19.7c0.7-2.7,1.5-7.1,0.4-9.6
                c-2.6-5.8-1-9.5,0.4-14.9c4.4-17.5,9.9-34.7,15.7-51.9c2.8-8.3,5.3-16.9,6.6-25.6c2.1-13.6-1.4-26.6-6.6-39.2
                c-5-12-7.6-24.5-6.9-37.8c0.8-15.1,1.7-30.1,3.8-45c2.2-15.7,3.7-31.6,5.6-47.4c0.6-5.3,1.6-10.6,2.1-15.9
                c2.4-23.3,4.8-46.6,6.9-69.9c1.7-18.6,1-37.1-2.4-55.5c-2.8-14.9-5-29.9-4.2-45.2c0.7-12.8-0.5-25.5-3.9-37.9
                c-2.2-8.1-3-16.3-1-24.5c2-8.2,4-16.3,6.3-24.4c4.3-15,7.9-30.1,10-45.6c0.1-0.9,0.5-4.3,0.5-5.2c-3.1,7.8-8,12.9-13.4,15.2
                c-6.1,2.6-13.9,3.3-19.7,1.4c-10.7-3.5-14.2-11.2-14.2-11.2c1.7,0.3,1.5,1.2,5.2,4.7c7.3,6.9,17,7.8,26.2,4.7
                c11.4-3.9,19-16.9,15.8-28.5c-1.2-4.4-0.1-7.1-0.1-7.1s3.9,18.8,5.4,27.7c1,5.8,1.3,11.8,2.8,17.5c2.8,10.6,6.5,21,9.6,31.5
                c5.1,17.4,9.7,35,15.1,52.3c4.3,13.9,9.5,27.5,13.9,41.4c4,12.5,7.5,25.2,11,37.8c1.9,6.8,3,13.9,7.9,19.4c1.5,1.7,3.4,3.5,5.5,4
                c4.7,1.1,9.6,1.5,14.5,2.1c0.5,0.1,1,0.1,1.6,0.1c3-0.6,6.2,0.2,8.9,1.4c1.4,0.6,2.7,1.4,4.2,1.8c0.3,0.1,2.4,0.6,4.7,0.4
                c1.2-0.1,3.1-1,2.8-2.5c-0.3-1.3-1.9-1.8-2.9-2.4c-1.4-0.7-2.8-1.6-4.2-2.3c-1.5-0.7-3-1.2-4.5-1.5c-2.6-0.6-5.5-1.4-7.4-3.4
                c-0.3-0.3,0.2-0.8,0.5-0.5c2.4,2.5,6.1,2.7,9.2,3.7c1.6,0.5,3.1,1.3,4.5,2.1c0.7,0.4,1.4,0.8,2.2,1.2c0.6,0.3,1.2,0.6,1.8,1
                c1,0.7,1.7,1.8,1.4,3.2c-0.3,1.3-1.6,1.4-1.9,1.7c0,0,0,0.1,0,0.1c4,1.3,8.7,9,13.7,6.2c0.4-0.2,0.4-0.6,0.2-0.9
                C426.6,471.4,425.1,470.6,424.3,469.8z M376.9,195.9c-5.4-8.7-6.6-18.7-8.3-28.5C375.1,175.8,375.2,186.1,376.9,195.9z
                M328.7,132.1c5.7,4.9,12.5,7.8,19.2,11c7.3,3.5,12.5,8.9,16,16.1c0.1,0.3,0.5,1.2,0.6,1.5c-0.2,0.1-1.7-1.4-1.9-1.2
                c-5.3-4.3-10.3-6.4-15.2-11.2c-5-4.8-11.2-8.2-16.7-12.5c-6.4-5-11.9-10.9-13.6-19.3c-0.9-4.5-1.3-9.1-2.4-13.5
                c-2.4-9.1-7.2-16.9-13.8-23.7c-2.6-2.6-5.9-6.2-8.3-9c7,5.7,14.3,12.6,19.8,19.8c5.3,6.9,6.1,14.8,6.6,22.8
                C319.5,120.8,322.9,127.1,328.7,132.1z M315.3,91.9C309,81.8,298,73.7,290,65.2C297.9,68.4,315.1,86.5,315.3,91.9z M204.7,110.5
                c1.7-8.4,4-16.7,6.1-25c1.9-7.6,3.7-15.2,5.9-22.7c1.2-4,3.1-7.9,4.8-11.8c2.3-5.1,6.4-8.5,11.3-10.8c3.4-1.6,6.9-0.9,10.1,0.7
                c1.7,0.8,2.9,0.9,4.8,0.2c4.3-1.5,8.5-0.5,12.4,1.8c3.8,2.2,6.2,5.8,8,9.7c5.7,12.2,9.9,24.8,10.5,38.5c0.4,9.1,1.6,17.8,2.9,27.3
                c0.7,5.5,3.7,10,7.6,14c6.3,6.2,14.3,9.5,22,13.5c5,2.6,10.7,4.2,14.7,8.7c0.3,0.3,0.5,0.7,1.2,1.6c-3.8-2-7-3.7-10.2-5.3
                c-6.5-3.2-13.2-6.4-19.7-9.7c-5.2-2.6-9.5-6.5-12.9-11.1c-3.4-4.6-5.1-10.1-5.8-15.8c-1.2-10.1-1.4-20.3-2.9-30.3
                c-1.8-12.2-5-24.1-11.8-34.7c-2.8-4.3-6.9-6.8-12-7c-1.8-0.1-3.6,0.9-5.4,1.3c-0.8,0.2-1.9,0.3-2.5-0.1c-4.4-2.8-8.8-2.6-13.2,0
                c-4.8,2.8-7.3,7.3-9.2,12.3c-3.3,8.6-5.8,17.3-7.6,26.3c-1.8,9.2-4.8,18.2-6.7,27.4c-2,9.7-1.8,19.9,3.8,28.3
                c0.7,1.1,2.6,4.2,8.2,8.6c0.4,0.3,1.1,0.8,1.5,1.2c-5.2-2-9.5-5.9-12.4-10.6C203.1,128.9,202.9,119.6,204.7,110.5z M199.9,149.2
                c-10.2-8.9-12.9-18.9-11.3-33.5c0.1-0.9,0.4-3.3,0.7-4.3c-0.2,3-0.4,6.6-0.3,8.2c0,0.5-1,19.6,23.4,32c3,1.4,3.5,1.6,4.7,4.6
                C210.5,155.5,204.6,153.3,199.9,149.2z M188.5,232c-0.2,1.8,1.4,1.5,1.4,4.6c0,4.2-1.2,7-1,10.1c0.7,13.6,13.7,24.5,27.3,23.7
                c7.3-0.4,13.3-3.3,18.2-8.7c0.6-0.7,1.3-1.3,2.2-1.6c-3.5,5.1-8.1,8.8-14.1,10.5c-5.9,1.7-12,2.2-17.8-0.3
                c-6.3-2.7-11.1-8.2-14.7-13.9c0.4,2,0.9,4.3,1.3,6.3c1.5,7.8,3.3,15.9,5.1,23.6c2.1,8.9,4.8,17.6,7.1,26.5
                c2.3,9.1,1.4,17.7-4.7,25.2c-2.2,2.7-3.9,5.9-6,8.7c1.6-3.5,2.3-7.5,4-11c2.4-4.8,2.1-9.8,1.5-14.7c-1.5-13.1-3.2-26.1-5.1-39.1
                c-1-7-3.1-13.8-3.8-20.8C188,248.7,186.9,246.2,188.5,232z M276.3,399.8c3.3-3.6,10.5-10.1,12.8-11.9c0.3-0.2,0.7-0.4,1,0
                c0,0,0,0,0,0c0.3,0.4,0,0.9-0.2,1.1c-0.6,0.5-1.2,1.1-1.9,1.6c-7.8,6-18.1,17.8-24.2,25.6c-4.2,5.4-5,6.1-9.1,11.6
                c-4.9,6.4-9.4,13.1-14,19.7c-1.7,2.6-2.3,5.5-2.4,8.7c-0.2,5.3-0.8,10.8-1,16.2c-0.4,10-0.9,20-0.8,30c0.2,14.4,0.5,28.8,1.4,43.2
                c0.9,13.9,2.5,27.7,3.8,41.6c1.2,11.9,2.4,23.9,3.6,35.8c0.8,7.5,2,15.1,2.4,22.6c0.6,11.9,0.8,23.8,1,35.7
                c0.1,6.5,1.4,12.7,4.7,18.4c2.8,4.7,3.7,10.3,2.2,15.6c-2.3,7.9-2.5,16.1-2,24.3c1.2,18.2,2.6,36.4,3.6,54.6
                c0.5,8.3,0.5,16.7,0.2,25c-0.1,3.9-0.9,7.8-2,11.5c-1.9,6.1-1.8,12.3-1.5,18.5c0.3,4.9-0.3,9.9-0.5,14.8c-0.4,0-0.7,0.1-1.1,0.1
                c-0.3-0.8-0.7-1.6-0.8-2.4c-2.6-17-5.1-34.1-4.9-51.4c0.2-14.1-0.3-28.3-1.2-42.5c-0.8-13.2-2.3-26.4-3.9-39.5
                c-1.2-9.1-3.1-18.2-4.7-27.3c-1-5.8-0.8-11.4,1.3-17.2c4.1-11.1,3.9-22.5,1.6-34c-3.5-17.7-5.6-35.5-6.3-53.6
                c-0.4-12.2-0.1-24.5-0.4-36.7c-0.4-15-1-30-1.5-45c-0.6-17.8-0.8-35.7-3.9-53.3c-1.2-6.8-3.4-13.6-6-20
                c-5.2-13.1-10.8-26.2-16.7-39c-6-13.1-7.3-16-12.9-24.8c-1.7-2.7-4.3-6.1-4.5-6.3c-0.2-0.2-0.3-0.7-0.1-0.9s0.7-0.1,0.8,0.1
                s2.1,2.2,4.7,6c5.2,7.5,9,15.8,12.8,24c5.4,11.6,10.2,23.5,15.1,35.3c1.8,4.4,3.1,8.9,4.7,13.4c0.3,0.7,0.8,1.5,1.4,2
                c2.6,2.1,9.5,1,11.2-1.9C249,431.1,262.3,415.1,276.3,399.8z M254.4,130.8c-3.3,2.1-6.9,3.1-10.8,3.1c-0.3,0-2-0.2-2.5-0.4
                c-0.4-0.1-0.7-0.3-0.7-0.3c-0.5-0.3-0.2-1.5,0.6-1.4c0.4,0.1,1.2,0.2,1.4,0.2c7.3,1.1,12.3-2.7,17.1-7.3c5.9-5.7,10-14.4,12.5-20.6
                c0.3-0.9,1.1-2.6,1.1-2.7c0.1-0.2,0.3-0.4,0.7-0.2c0.2,0.1,0.5,0.3,0.4,0.7c-0.3,1.1-1.9,5.1-2.1,5.7
                C269.2,113.6,263,125.3,254.4,130.8z"/>
        </g>
        <g id="Dress_Hover">
          <linearGradient id="p-hips-c" gradientUnits="userSpaceOnUse" x1="231.3502" y1="468.0468" x2="231.3502" y2="405.0468">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['p-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['p-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['p-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['p-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['p-hips'].toString()} data-isselected={selectedPart === null && activeTarget === 'product' ? 'none' : selectedPart === 'p-hips' ? 'true' : 'false'} id="p-hips" style={{ fill: 'url(#p-hips-c)' }} d="
                M306.4,462.1c-1.8-17.7-4.1-35.2-7.2-52.7c-0.3-1.5-0.5-2.8-0.7-4.3H166.9c-4.3,9.3-6.7,13.9-8.5,24.9c-1.8,11.2-2.5,25-2.6,38.1
                h151.2C306.8,466,306.6,464.1,306.4,462.1z"/>

          <linearGradient id="p-waist-c" gradientUnits="userSpaceOnUse" x1="242.5262" y1="352.5468" x2="242.5262" y2="310.0468">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['p-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['p-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['p-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['p-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['p-waist'].toString()} data-isselected={selectedPart === null && activeTarget === 'product' ? 'none' : selectedPart === 'p-waist' ? 'true' : 'false'} id="p-waist" style={{ fill: 'url(#p-waist-c)' }} d="
                M291.6,325.1c1.3-5,2.5-10,3.9-15h-93.2c0.3,1.4,0.6,2.7,1,4.2c2,8.5,0.9,16.7-5.1,24.4c-3.5,4.5-6.1,9.1-8.4,13.9h103.1
                C290.6,343.4,289.2,334.4,291.6,325.1z"/>

          <linearGradient id="p-bust-c" gradientUnits="userSpaceOnUse" x1="249.3806" y1="278.4144" x2="249.3806" y2="224.9356">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['p-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['p-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['p-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['p-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['p-bust'].toString()} data-isselected={selectedPart === null && activeTarget === 'product' ? 'none' : selectedPart === 'p-bust' ? 'true' : 'false'} id="p-bust" style={{ fill: 'url(#p-bust-c)' }} d="
                M309.3,245.2c0.7-4.9,0.6-9.9,0.2-14.8c-0.2-1.9-0.4-3.5-0.7-5.4h-56c-1.1,5.8-2,11.8-2.2,12.5c-0.2,1.3-0.5,2.9-0.7,2.9
                c-0.1-0.2-0.3-0.4-0.3-0.7c-1-5.5-2.8-9.8-4.6-14.8h-54.8c-0.7,11.5-1.3,20.1-1.2,21.8c0.1,2.5,0.4,7.6,2.1,15.8
                c1.3,6.3,2.3,11.2,3.3,15.8l109.2,0c0.1-0.3,0.1-0.4,0.2-0.8C305.9,266.9,307.7,256.1,309.3,245.2z"/>

          <linearGradient id="p-shoulders-c" gradientUnits="userSpaceOnUse" x1="246.5093" y1="200.1843" x2="244.607" y2="163.0521">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['p-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['p-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['p-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['p-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['p-shoulders'].toString()} data-isselected={selectedPart === null && activeTarget === 'product' ? 'none' : selectedPart === 'p-shoulders' ? 'true' : 'false'} id="p-shoulders" style={{ fill: 'url(#p-shoulders-c)' }} d="
                M231.9,202.2l-40.7,2.5c0.4-11.5,0.6-22.9-0.2-30.8c0.5,5.6,0.2,18.4-0.4,30.9l-29.5,1.9c-0.6-7.9-0.3-15.7,3-23.2
                c1.7-3.9,5.5-8.5,9-10.6c4.8-3,10.3-4.8,16.4-4.7c4.4,0,9.5-0.3,12.9-3c0.5,0.7,2.6,3.5,3.4,4.6c7.3,9.2,14.5,18.4,21.9,27.5
                C229,199,230.4,200.6,231.9,202.2z M305.4,194.5c-0.2-9.8-0.7-19.3-0.7-29.1c0.2,0.4,0.5,19.4,1.1,32.3l26.3-1.6
                c-0.1-1.4-0.2-2.8-0.3-4.1c-0.4-5.7-1-11.3-3.1-16.6c-2.4-6.2-5.4-13.2-12-16c-2.7-1.1-5.7-1.7-8.6-1.9c-4.6-0.3-10,0-14.8,0
                c-2,3.7-3.7,8.1-6.1,11.6c-7.1,10.4-15.1,20.8-22.5,31.1l40.8-2.5C305.5,196.7,305.5,195.6,305.4,194.5z"/>

          <polyline id="p-length" className="model-size-vector-part-lines" data-isvalid={partsValidity?.[activeSize]['p-length'].toString()} points="84.3,158.4 37.7,158.4 37.7,972.3 84.3,972.3 	" data-isactive={selectedPart === 'p-length' ? 'true' : 'false'} style={{ fill: 'none', stroke: partsValidity?.[activeSize]['p-length'] ? (selectedPart === 'p-length' ? activeColor : defaultColor) : invalidColor, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', strokeMiterlimit: 10 }} />
        </g>
        <g id="Body_Hover">
          <linearGradient id="b-hips-c" gradientUnits="userSpaceOnUse" x1="229.772" y1="468.3379" x2="229.772" y2="405.0102">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['b-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['b-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['b-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['b-hips'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['b-hips'].toString()} data-isselected={selectedPart === null && activeTarget === 'body' ? 'none' : selectedPart === 'b-hips' ? 'true' : 'false'} id="b-hips" style={{ fill: 'url(#b-hips-c)' }} d="M221,435.6
                c-4.3-10.4-8.3-20.3-13-30.6h63.5c-12.4,13.9-23.7,28-33.3,44.1c-1.7,2.8-8.6,4-11.2,1.9c-0.6-0.5-1.1-1.2-1.4-2
                C224.2,444.5,222.9,440,221,435.6z M300.1,432.8c-1.8-9.4-3.3-18.3-4-27.8l-22.9,0c-3.7,4.1-6.7,7.7-9.3,11.1
                c-4.2,5.4-5,6.1-9.1,11.6c-4.9,6.4-9.4,13.1-14,19.7c-1.7,2.6-2.3,5.5-2.4,8.7c-0.2,4.1-0.6,8-0.8,12.2h65.8
                C303.4,456.3,302.3,444.7,300.1,432.8z M227.6,461.2c-1.2-6.8-3.4-13.6-6-20c-4.9-12.3-9.9-24.1-15.4-36.2c0,0-38.8,0-39.4,0
                c-0.7,2-6.1,11.3-7.9,21.7c-2.4,12-2.4,19.8-2.6,23.5c-0.3,6.2-0.4,12-0.1,18.1l72.4,0C228.4,465.9,228.1,463.7,227.6,461.2z"/>

          <linearGradient id="b-waist-c" gradientUnits="userSpaceOnUse" x1="242.129" y1="352.5879" x2="242.129" y2="310.0879">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['b-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['b-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['b-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['b-waist'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['b-waist'].toString()} data-isselected={selectedPart === null && activeTarget === 'body' ? 'none' : selectedPart === 'b-waist' ? 'true' : 'false'} id="b-waist" style={{ fill: 'url(#b-waist-c)' }} d="M290.9,325.3
                c1.2-5.1,2.4-10.1,3.8-15.2h-91.9c0.3,1,0.5,1.9,0.7,2.8c2.3,9.1,1.4,17.7-4.7,25.2c-2.2,2.7-3.9,5.9-6,8.7c-1,1.5-2.5,4.6-3.1,5.7
                h103c-0.2-1-0.5-1.8-0.7-2.9C289.7,341.7,288.9,333.5,290.9,325.3z"/>

          <linearGradient id="b-bust-c" gradientUnits="userSpaceOnUse" x1="248.5754" y1="278.4144" x2="248.5754" y2="224.8484">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['b-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['b-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['b-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['b-bust'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['b-bust'].toString()} data-isselected={selectedPart === null && activeTarget === 'body' ? 'none' : selectedPart === 'b-bust' ? 'true' : 'false'} id="b-bust" style={{ fill: 'url(#b-bust-c)' }} d="M294.2,265.3
                c-6.1,2.6-13.9,3.3-19.7,1.4c-10.7-3.5-14.2-11.2-14.2-11.2c1.7,0.3,1.5,1.2,5.2,4.7c7.3,6.9,17,7.8,26.2,4.7
                c11.4-3.9,19-16.8,15.8-28.5c-1.2-4.4-0.1-7.1-0.1-7.1s0,0,0,0c0-2.5-2-4.5-4.5-4.5c-17.3,0-91.5,0-108.4,0c-2.3,0-4.3,1.7-4.5,4
                c-0.3,2.8,0,5.8,0,7.9c0,4.5-1.2,7-1,10.1c0.7,13.6,13.8,24.5,27.3,23.7c7.3-0.5,13.3-3.4,18.2-8.7c0.6-0.7,1.3-1.3,2.2-1.6
                c-3.5,5.1-8.1,8.8-14.1,10.5c-5.9,1.7-12,2.2-17.8-0.3c-6.3-2.7-11.1-8.2-14.7-13.9c0.4,2,0.9,4.4,1.3,6.4c1,5.1,2.1,10.4,3.3,15.5
                h108.4c1.7-7.6,3.2-15.3,4.3-23.1c0.1-0.9,0.5-4.3,0.5-5.3C304.6,257.8,299.6,263,294.2,265.3z"/>

          <linearGradient id="b-shoulders-c" gradientUnits="userSpaceOnUse" x1="246.9107" y1="204.2659" x2="242.5511" y2="154.4356">
            <stop offset="0" style={{ stopColor: partsValidity?.[activeSize]['b-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
            <stop offset="0.35" style={{ stopColor: partsValidity?.[activeSize]['b-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="0.65" style={{ stopColor: partsValidity?.[activeSize]['b-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s' }} />
            <stop offset="1" style={{ stopColor: partsValidity?.[activeSize]['b-shoulders'] ? activeColor : invalidColor, transitionDuration: '0.2s', stopOpacity: 0 }} />
          </linearGradient>

          <path className="model-size-vector-part" data-isvalid={partsValidity?.[activeSize]['b-shoulders'].toString()} data-isselected={selectedPart === null && activeTarget === 'body' ? 'none' : selectedPart === 'b-shoulders' ? 'true' : 'false'} id="b-shoulders" style={{ fill: 'url(#b-shoulders-c)' }} d="M331.7,197.8
                c-0.5-7.8-0.6-15.7-3.6-23.1c-4.6-11.6-10-16-21.7-16.6c-6-0.3-12-0.1-17.9-0.5c-5.6-0.3-11.1-2.8-15.3-6.3l-56.1,5.4
                c-0.5,0.8-1.7,1.7-2.2,2c-1.9,1.4-3.7,2.8-5.8,3.9c-7,3.9-14.5,5.6-22.5,6.5c-10.4,1.1-18.7,6.2-22.3,16.9
                c-2.7,8-3.5,16.3-2.5,24.7L331.7,197.8z"/>

          <polyline id="b-height" className="model-size-vector-part-lines" data-isvalid={partsValidity?.[activeSize]['b-height'].toString()} points="427.7,17 474.3,17 474.3,1006.4 427.7,1006.4 	" data-isactive={selectedPart === 'b-height' ? 'true' : 'false'} style={{ fill: 'none', stroke: partsValidity?.[activeSize]['b-height'] ? (selectedPart === 'b-height' ? activeColor : defaultColor) : invalidColor, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', strokeMiterlimit: 10 }} />
        </g>
      </svg>
    </>
  )
}
//                                      ------------------------     Step Two     ------------------------
function EditProductImagesContainer({ selectedVar, onValidate }: { selectedVar: ColorKey; onValidate: (isvalid: boolean) => void; }) {
  const { setTopLayerIsActive } = usePage();
  const { productDic, updateProductDic, attemptedSumbit } = useProductEdit();
  const [selectedFiles, setSelectedFiles] = useState((productDic?.vars && Object.keys(productDic?.vars).length < 1) ? [] : (productDic?.vars[selectedVar]['var-imgs'] ?? []));
  const [editEnabled, setEditEnabled] = useState(false);
  const [isInDrag, setIsInDrag] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [lastActiveCard, setLastActiveCard] = useState<string | null>(null);
  const activeCardPositionRef = useRef<{ x: number | undefined; y: number | undefined; }>({ x: undefined, y: undefined });
  const [activePh, setActivePh] = useState<string | null>(null);
  const containerWidthRef = useRef(0);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const maxFiles = 6;

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      containerWidthRef.current = width;
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedFiles(productDic?.vars[selectedVar]['var-imgs'] ?? []);

    // console.log(selectedFiles);
  }, [selectedVar]);

  useEffect(() => {
    if (!productDic?.vars || Object.keys(productDic?.vars).length < 1) return;

    // console.log(selectedFiles);
    updateProductDic(draft => {
      if (!draft) return;

      draft.vars[selectedVar]['var-imgs'] = selectedFiles;
    });
    onValidate(selectedFiles.length > 0);
  }, [selectedFiles]);

  async function HandleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const modFiles = files.slice(0, maxFiles - selectedFiles.length);

    if (files.length + selectedFiles.length > maxFiles) {
      await new Promise((resolve) => {
        setTopLayerIsActive(true, 'alert', { title: 'Images limit reached', message: `You can only upload up to ${maxFiles} images for each variant` }, resolve);
      });
    }

    if (modFiles.length + selectedFiles.length > maxFiles) return;

    setSelectedFiles((prevFiles) => [...prevFiles, ...modFiles.map((value) => {
      return { link: null, blob: value }
    })]);
  }

  function HandleImageReposition() {
    if (!lastActiveCard || !activePh) return;

    const ac = parseInt(lastActiveCard);
    const ck = parseInt(activePh.replace('-', ''));

    // console.warn('repositioning card ' + lastActiveCard + ' to position ' + activePh);

    const img = selectedFiles[ac];
    const updatedList = [...selectedFiles];
    updatedList.splice(ac, 1);
    updatedList.splice(ck > ac ? ck - 1 : ck, 0, img);

    setSelectedFiles(updatedList);
  }

  function HandleImageDelete(cardKey: string) {
    const ac = parseInt(cardKey);

    setSelectedFiles((sf) => sf.filter((_img, key) => key != ac));
  }

  function HandleImageReplace(cardKey: string, newImage: FileList) {
    const ac = parseInt(cardKey);
    const file = Array.from(newImage)[0];

    const updatedList = [...selectedFiles];
    updatedList.splice(ac, 1, { link: null, blob: file });

    setSelectedFiles(updatedList);
  }

  return (
    <>
      <div className="ep-images-status-bar">
        <p>{selectedFiles.length} images of 6</p>
        <button disabled={selectedFiles.length > 0 ? false : true} onClick={() => setEditEnabled((enabled) => !enabled)}>{editEnabled ? 'done' : 'edit'}</button>
      </div>
      <div className="ep-variation-images-container" style={{ padding: (selectedFiles.length < 6) ? '0px 22px 0px 11px' : '0px 11px', justifyContent: selectedFiles.length < 1 ? 'center' : undefined, overflowX: isInDrag ? 'hidden' : 'auto' }} ref={imageContainerRef}>
        {Object.entries(selectedFiles).map(([, value], id) => {
          return (
            <React.Fragment key={id}>
              <EditPageVariationImageCardPlaceholder cardKey={`-${id}`} activeCard={activeCard} editEnabled={editEnabled} isInDrag={isInDrag} activeCardPositionRef={activeCardPositionRef} activePh={activePh} setActivePh={setActivePh} handleImageReposition={HandleImageReposition} containerWidth={containerWidthRef.current} />
              <EditPageVariationImageCard cardKey={`${id}`} image={value.link === null ? value.blob : value.link} setActiveCard={setActiveCard} editEnabled={editEnabled} imageContainerRef={imageContainerRef} setIsInDrag={setIsInDrag} activeCardPositionRef={activeCardPositionRef} setLastActiveCard={setLastActiveCard} handleImageReplace={HandleImageReplace} handleImageDelete={HandleImageDelete} setSelectedFiles={setSelectedFiles} />
              {selectedFiles.length - 1 === id && <EditPageVariationImageCardPlaceholder cardKey={`-${id + 1}`} activeCard={activeCard} editEnabled={editEnabled} isInDrag={isInDrag} activeCardPositionRef={activeCardPositionRef} activePh={activePh} setActivePh={setActivePh} handleImageReposition={HandleImageReposition} containerWidth={containerWidthRef.current} />}
            </React.Fragment>
          )
        })}
        {selectedFiles.length < 6 &&
          <div className="ep-variation-image-add-card" data-errorshow={attemptedSumbit && selectedFiles.length < 1 ? 'true' : 'false'}>
            <input type="file" id={'variation-images-input'} multiple accept="image/*" onChange={(e) => HandleFileChange(e)} />
            <label htmlFor="variation-images-input" tabIndex={0}></label>
            <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt='' />
            <p>add variant images</p>
          </div>
        }
      </div>
      {(attemptedSumbit && selectedFiles.length < 1) &&
        <div className="ep-error-line-container">
          <EditProductErrorLine errorMessage={"Each variant must have a minimum of 1 image"} />
        </div>
      }
    </>
  )
}

interface EditPageVariationImageCardProps {
  image: string | File | null | undefined;
  cardKey: string;
  editEnabled: boolean;
  imageContainerRef: RefObject<HTMLDivElement | null>;
  setIsInDrag: Dispatch<SetStateAction<boolean>>
  setActiveCard: Dispatch<SetStateAction<string | null>>
  setLastActiveCard: Dispatch<SetStateAction<string | null>>
  activeCardPositionRef: RefObject<{ x: number | undefined; y: number | undefined; }>
  handleImageReplace: (oldImgLink: string, newImgLink: FileList) => void;
  handleImageDelete: (imgLink: string) => void;
  setSelectedFiles: Dispatch<SetStateAction<ImageObject[]>>;
}

function EditPageVariationImageCard({ image, cardKey, editEnabled, imageContainerRef, setIsInDrag, setActiveCard, setLastActiveCard, activeCardPositionRef, handleImageReplace, handleImageDelete, setSelectedFiles }: EditPageVariationImageCardProps) {
  const { setTopLayerIsActive } = usePage();
  const { blobUrls } = useProductEdit();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const imageCardRef = useRef<HTMLDivElement | null>(null);
  const invisibleInputRef = useRef<HTMLInputElement | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialPosRef = useRef({ x: 0, y: 0 });
  const dragEnabledRef = useRef(false);

  const edgeThreshold = 50;
  const scrollSpeed = 6;
  const scrollInterval = 10;
  const imageTargetWidth = 1440;
  const imageTargetHeight = 1920;

  useEffect(() => {
    if (editEnabled) return;

    dragEnabledRef.current = false;
    setIsInDrag(false);
    setActiveCard(null);
    initialPosRef.current = { x: 0, y: 0 };
    activeCardPositionRef.current = { x: undefined, y: undefined };
    if (imageCardRef.current) imageCardRef.current.style.transform = `scale(100%) translate(0px, 0px)`;
  }, [editEnabled]);

  // Pointer Wrappers
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return; // return if touch control is detected

    if (e.button !== 0 || !imageContainerRef.current) return;

    handleStart(e.clientX, e.clientY);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    handleMove(e.clientX, e.clientY);
  }

  function handlePointerUp() {
    handleEnd();

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  function handleStart(xPos: number, yPos: number) {
    if (!editEnabled || !imageContainerRef.current) return;

    // Get current scroll offset of the container
    const container = imageContainerRef.current;
    const scrollLeft = container.scrollLeft;

    initialPosRef.current = { x: xPos + scrollLeft, y: yPos };

    // Start hold timer for delayed drag activation
    dragTimeoutRef.current = setTimeout(() => {
      dragEnabledRef.current = true;
      setIsInDrag(true);
      setActiveCard(cardKey);
      setLastActiveCard(cardKey);
    }, 175);
  }

  function handleMove(xPos: number, yPos: number) {
    if (!imageCardRef.current) return;

    if (!dragEnabledRef.current || !imageContainerRef.current) {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      return;
    }

    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();

    const scrollLeft = container.scrollLeft;
    const newX = xPos - initialPosRef.current.x + scrollLeft;
    const newY = yPos - initialPosRef.current.y;

    imageCardRef.current.style.transform = `scale(70%) translate(${newX}px, ${newY}px)`;
    imageCardRef.current.style.transitionDuration = '0s';
    activeCardPositionRef.current = { x: xPos + scrollLeft, y: yPos };
    // console.warn(activeCardPositionRef.current);

    // Check if within edge threshold and start continuous scrolling
    if (xPos < rect.left + edgeThreshold && !scrollIntervalRef.current) {
      startScrolling(-1); // Scroll left
    } else if (xPos > rect.right - edgeThreshold && !scrollIntervalRef.current) {
      startScrolling(1); // Scroll right
    } else if (xPos >= rect.left + edgeThreshold && xPos <= rect.right - edgeThreshold && scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current); // Stop scrolling
      scrollIntervalRef.current = null;
    }
  }

  function handleEnd() {
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current); // Stop any ongoing scrolling
    scrollIntervalRef.current = null;

    dragEnabledRef.current = false;
    setIsInDrag(false);
    setActiveCard(null);
    initialPosRef.current = { x: 0, y: 0 };
    activeCardPositionRef.current = { x: undefined, y: undefined };
    if (imageCardRef.current) imageCardRef.current.style.transform = `scale(100%) translate(0px, 0px)`;
  }

  function startScrolling(direction: number) {
    if (!imageContainerRef.current) return;
    const container = imageContainerRef.current;

    // Clear any previous interval
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);

    // Start new interval to scroll in specified direction
    scrollIntervalRef.current = setInterval(() => {
      container.scrollBy({ left: direction * scrollSpeed, behavior: 'smooth' });
    }, scrollInterval);
  }

  const convertAndResizeImage = (fileOrUrl: string | File): Promise<{ url: string; file: File }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Possibly caused by an unsupported format... Make sure to use JPG, PNG, or WebP and try again"));
      };

      if (typeof fileOrUrl === "string") {
        img.src = fileOrUrl;
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const str = reader.result?.toString();
          if (str) img.src = str;
          else reject(new Error("Invalid file data"));
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsDataURL(fileOrUrl);
      }

      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imageTargetWidth;
          canvas.height = imageTargetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas context could not be created"));

          ctx.drawImage(img, 0, 0, imageTargetWidth, imageTargetHeight);

          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Blob creation failed"));

            const file = new File([blob], "converted.webp", {
              type: "image/webp",
              lastModified: Date.now(),
            });

            const webpUrl = URL.createObjectURL(file);
            resolve({ url: webpUrl, file });
          }, "image/webp", 0.95);
        } catch (err) {
          reject(err);
        }
      };
    });
  };

  useEffect(() => {
    if (image) {
      setImageLoaded(false);
      if (typeof image === "string") {
        SetImageUrl(image);
      } else {
        // console.warn('this ran');

        convertAndResizeImage(image)
          .then(({ url: webpUrl, file }) => {
            SetImageUrl(webpUrl);
            setSelectedFiles((currFiles) => currFiles.map((val, index) => {
              // console.error(val);
              if ((index).toString() === cardKey) return { link: webpUrl, blob: file };
              else return val;
            }));
            blobUrls.push(webpUrl);
            // console.log(blobUrls);
          })
          .catch(async (error) => {
            if (!(error instanceof Error)) return;
            console.error("Error processing image: ", error.message);

            await new Promise((resolve) => {
              setTopLayerIsActive(true, 'alert', { title: 'Error processing image', message: error.message }, resolve);
            });

            const ac = parseInt(cardKey);
            setSelectedFiles((sf) => sf.filter((_img, key) => key != ac));
          });
      }
    }

    function SetImageUrl(webpUrl: string) {
      setProcessedImage(webpUrl);
      setImageLoaded(true);
    }
  }, [image]);

  function HandleImageClick() {
    if (editEnabled || !image || typeof image !== 'string') return;

    let imgUrl = image;

    if (image.includes('-thumb')) imgUrl = imgUrl.replace('-thumb', '');

    imgUrl = ImageUrl(imgUrl);
    setTopLayerIsActive(true, 'view', { image: imgUrl }, null);
  }

  return (
    <div className="ep-variation-image-card" ref={imageCardRef} data-editenabled={editEnabled} data-isloaded={imageLoaded} data-isactive={dragEnabledRef.current} style={{ transform: dragEnabledRef.current && editEnabled ? undefined : `scale(100%) translate(${0}px, ${0}px)`, transitionDuration: dragEnabledRef.current && editEnabled ? '0s' : '0.3s' }} onClick={HandleImageClick}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onPointerDown={handlePointerDown}
    >
      {!imageLoaded ?
        <img className="loading-image" src={loadingImage} alt="loading" />
        :
        <div>
          <img src={processedImage ? ImageUrl(processedImage) : undefined} alt={"product image " + cardKey} />
          <button className="ep-variation-view-image-button"></button>
          <div className="ep-variation-card-top-bar" data-editenabled={editEnabled.toString()}>
            <button className="ep-variation-delete-image-button" disabled={!editEnabled} onClick={(e) => (e.stopPropagation(), handleImageDelete(cardKey))}>
              <img src={ImageUrl('ui-images/x-icon.svg')} alt="" />
            </button>
          </div>
          <div className="ep-variation-card-bottom-bar" data-editenabled={editEnabled.toString()}>
            <button className="ep-variation-replace-image-button" disabled={!editEnabled} onClick={(e) => (e.stopPropagation(), invisibleInputRef.current?.click())}>
              <img src={ImageUrl('ui-images/switch-icon.svg')} alt="" />
              <p>replace image</p>
              <input ref={invisibleInputRef} type="file" accept="image/*" onChange={(e) => { if (e.target.files) handleImageReplace(cardKey, e.target.files) }} />
            </button>
          </div>
        </div>
      }
    </div>
  )
}

interface EditPageVariationImageCardPlaceholderProps {
  isInDrag: boolean;
  cardKey: string;
  activeCard: string | null;
  editEnabled: boolean;
  containerWidth: number
  activeCardPositionRef: RefObject<{ x: number | undefined; y: number | undefined; }>
  activePh: string | null;
  setActivePh: React.Dispatch<React.SetStateAction<string | null>>;
  handleImageReposition: () => void;
}

function EditPageVariationImageCardPlaceholder({ isInDrag, cardKey, activeCard, editEnabled, containerWidth, activeCardPositionRef, activePh, setActivePh, handleImageReposition }: EditPageVariationImageCardPlaceholderProps) {
  const [position, setPosition] = useState(0);
  const [inProximity, setInProximity] = useState(false);
  const [isInteractable, setIsInteractable] = useState(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInDrag) return;

    let frame: number;

    const checkProximity = () => {
      const activePos = activeCardPositionRef.current;
      if (!activePos.x) {
        frame = requestAnimationFrame(checkProximity);
        return;
      }

      if (position <= activePos.x) {
        if (activePos.x - position <= 26) {
          // console.log('placeholder: ' + cardKey + ' position: ' + position + ' activeCardPosition: ' + activeCardPosition.x);
          setInProximity(true);
          setActivePh(cardKey);
        } else {
          setInProximity(false);
        }
      } else if (position >= activePos.x) {
        if (position - activePos.x <= 26) {
          // console.log('placeholder: ' + cardKey + ' position: ' + position + ' activeCardPosition: ' + activeCardPosition.x);
          setInProximity(true);
          setActivePh(cardKey);
        } else {
          setInProximity(false);
        }
      } else {
        setInProximity(false);
        setActivePh(null);
      }

      frame = requestAnimationFrame(checkProximity);
    };

    frame = requestAnimationFrame(checkProximity);

    return () => cancelAnimationFrame(frame);
  }, [isInDrag, position, cardKey]);

  useEffect(() => {
    // console.log(containerWidth)
    if (!placeholderRef.current) return;

    const ph = placeholderRef.current;
    const phParent = ph.parentElement;

    if (!ph || !phParent) return;

    const phPosition = phParent.scrollLeft + ph.getBoundingClientRect().x;
    setPosition(phPosition);

    // console.warn('placeholder: ' + cardKey + ' position: ' + phPosition);

  }, [placeholderRef, containerWidth]);

  useEffect(() => {
    if (!activeCard) {
      setIsInteractable(true);
      return;
    }

    const ac = parseInt(activeCard);
    const ck = parseInt(cardKey.replace('-', ''));

    if (ck === ac || ck - 1 === ac) setIsInteractable(false);
    else setIsInteractable(true);

  }, [activeCard]);

  useEffect(() => {
    if (!isInDrag && inProximity && activePh === cardKey && isInteractable) {
      // console.log('repositioning image');
      handleImageReposition();
      setInProximity(false);
    }
  }, [inProximity, activePh, isInDrag]);

  return (
    <div className="ep-variation-image-card-placeholder" ref={placeholderRef} data-editenabled={editEnabled.toString()} data-interactable={isInteractable.toString()} data-isactive={isInDrag && inProximity && isInteractable ? 'true' : 'false'} ></div>
  )
}

interface EditPageVariationButtonsContainerProps {
  selectedVar: string;
  setSelectedVar: Dispatch<SetStateAction<ColorKey | undefined>>;
  fieldsValidity: Record<string, boolean> | undefined;
  generateNewVarValidityKeys: (varName: string) => void;
}

function EditPageVariationButtonsContainer({ selectedVar, setSelectedVar, fieldsValidity, generateNewVarValidityKeys }: EditPageVariationButtonsContainerProps) {
  const { productDic, updateProductDic, varNumber, setVarNumber, attemptedSumbit } = useProductEdit();
  // const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const [overrideStyle, setOverrideStyle] = useState(false);
  // const containerWidthRef = useRef(0);
  const buttonsContainerRef = useRef<HTMLUListElement | null>(null);
  const activeVarButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let resizeRafId: number | null = null;
    const buttonsContainer = buttonsContainerRef.current;

    const updateWidth = () => {
      if (resizeRafId || !buttonsContainer) return;
      
      resizeRafId = requestAnimationFrame(() => {
        const width = buttonsContainer.getBoundingClientRect().width;
        const fullWidth = buttonsContainer.scrollWidth + buttonsContainer.scrollLeft;

        setOverrideStyle(fullWidth > Math.ceil(width));
        
        resizeRafId = null;
      });
    };

    updateWidth(); // Initialize on mount

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!buttonsContainerRef.current) return

    const width = buttonsContainerRef.current.getBoundingClientRect().width;
    const fullWidth = buttonsContainerRef.current.scrollWidth + buttonsContainerRef.current.scrollLeft;

    setOverrideStyle(fullWidth > Math.ceil(width));

  }, [productDic?.vars]);

  useEffect(() => {
    if (!activeVarButtonRef) return;

    const scrollTop = document.getElementsByClassName('third-layer-page')[0].scrollTop;
    activeVarButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: 'center' });
    document.getElementsByClassName('third-layer-page')[0].scrollTop = scrollTop;

  }, [activeVarButtonRef, selectedVar]);

  function HandleAddNewVarient() {
    updateProductDic(draft => {
      if (!draft) return;

      draft.vars[`_${varNumber}`] = defaultVarsDic;
    });

    setSelectedVar(`_${varNumber}`);
    generateNewVarValidityKeys(`_${varNumber}`);
    setVarNumber(varNumber + 1);
  }

  function CheckVarFieldsValid(varName: string) {
    if (!fieldsValidity) return;

    let result = true;

    for (const [, val] of Object.entries(fieldsValidity).filter(([entry,]) => entry.startsWith(`${varName}.`))) {
      if (val === false) { result = false; break; }
    }

    return result;
  }

  if (productDic?.vars) return (
    <div className="pv-vars-buttons-container-wrapper">
      <ul className='pv-vars-buttons-container' ref={buttonsContainerRef} style={{ justifyContent: overrideStyle ? 'flex-start' : 'center', width: Object.entries(productDic.vars).length > 1 ? 'calc(99% - 32px)' : '100%', height: '100%', padding: Object.entries(productDic.vars).length > 1 ? '0% 2% 0% 3%' : '0', marginTop: '0' }}>
        {Object.entries(productDic.vars).map(([key, value], id) => {
          return (
            <li key={key + id}>
              <button ref={selectedVar === key ? activeVarButtonRef : null} data-isvalid={attemptedSumbit && !CheckVarFieldsValid(key) ? 'false' : 'true'} data-isactive={id === 0 && selectedVar === null ? 'true' : (selectedVar === key).toString()} onClick={() => { if (selectedVar === key) return; setSelectedVar(key) }}>
                <img src={value['color-img'].link ? ImageUrl(value['color-img'].link) : undefined} alt='' />
                <p>{key.startsWith('_') ? null : value.new_color.sc ?? key}</p>
              </button>
            </li>
          )
        })}
      </ul>
      <button className='ep-add-new-var-button' onClick={HandleAddNewVarient}>
        <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt='' />
      </button>
    </div>
  )
}

function EditPageVariationColorImageContainer({ selectedVar, onValidate }: { selectedVar: ColorKey; onValidate: (isvalid: boolean) => void; }) {
  const { setTopLayerIsActive } = usePage();
  const { blobUrls, productDic, updateProductDic, attemptedSumbit } = useProductEdit();
  const [selectedImage, setSelectedImage] = useState((productDic?.vars && Object.keys(productDic.vars).length < 1) ? null : productDic?.vars[selectedVar]['color-img']);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);


  useEffect(() => {
    setSelectedImage(productDic?.vars[selectedVar]['color-img']);
  }, [selectedVar]);

  useEffect(() => {
    if (!productDic?.vars || Object.keys(productDic.vars).length < 1 || !selectedImage) return;

    // console.log(selectedImage);
    updateProductDic(draft => {
      if (!draft) return;

      draft.vars[selectedVar]['color-img'] = selectedImage;
    });
    onValidate(!!(selectedImage?.link));
  }, [selectedImage]);

  function HandleImageSelect(newImage: FileList) {
    const file = Array.from(newImage)[0];

    setSelectedImage({ link: null, blob: file });
  }

  const convertAndResizeImage = (fileOrUrl: string | File): Promise<{ url: string; file: File }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      if (typeof fileOrUrl === "string") {
        img.src = fileOrUrl; // URL case
      } else {
        // if file object, use FileReader
        const reader = new FileReader();
        reader.onload = () => {
          const str = reader.result?.toString();
          if (str) img.src = str; // Use Data URL as img source
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsDataURL(fileOrUrl);
      }

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 100;
          canvas.height = 100;

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas context could not be created"));

          ctx.drawImage(img, 0, 0, 100, 100);

          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Blob creation failed"));

            const file = new File([blob], "converted.webp", {
              type: "image/webp",
              lastModified: Date.now(),
            });

            const webpUrl = URL.createObjectURL(file);
            resolve({ url: webpUrl, file });
          }, "image/webp", 0.95);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error("Possibly caused by an unsupported format... Make sure to use JPG, PNG, or WebP and try again"));
    });
  };

  useEffect(() => {
    // console.log(selectedImage);
    if (!selectedImage) return;

    const image = selectedImage.link === null ? selectedImage.blob : selectedImage.link;

    if (image) {
      setImageLoaded(false);
      if (typeof image === "string") {
        SetImageUrl(image);
      } else {
        // console.warn('this bish ran');
        convertAndResizeImage(image)
          .then(({ url: webpUrl, file }) => {
            SetImageUrl(webpUrl);
            setSelectedImage({ link: webpUrl, blob: file });
            // console.log(selectedImage);
            blobUrls.push(webpUrl);
            // console.log(blobUrls);
          })
          .catch(async (error) => {
            if (!(error instanceof Error)) return;
            console.error("Error processing image: ", error.message);

            await new Promise((resolve) => {
              setTopLayerIsActive(true, 'alert', { title: 'Error processing image', message: error.message }, resolve);
            });

            setSelectedImage(null);
          });
      }
    }

    function SetImageUrl(webpUrl: string) {
      setProcessedImage(webpUrl);
      setImageLoaded(true);
    }
  }, [selectedImage]);

  return (
    <div className="ep-variation-color-image-card" data-errorshow={attemptedSumbit && (!selectedImage?.link) ? 'true' : 'false'} data-isfilled={!selectedImage?.link && !selectedImage?.blob ? 'false' : 'true'}>
      <input style={{ display: "none" }} type="file" id={'variation-color-image-input'} accept="image/*" onChange={(e) => { if (e.currentTarget.files) HandleImageSelect(e.currentTarget.files) }} />
      <label htmlFor="variation-color-image-input" tabIndex={0}></label>
      {!selectedImage?.link && !selectedImage?.blob ?
        <>
          <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt='' />
          <p>select image</p>
        </>
        :
        <>
          {!imageLoaded ?
            <img className="loading-image" src={loadingImage} alt="loading" />
            :
            <img src={processedImage ? ImageUrl(processedImage) : undefined} alt="variation color image" style={{ visibility: imageLoaded ? "visible" : "hidden", width: imageLoaded ? "100%" : undefined }} onLoad={() => setImageLoaded(true)} />
          }
        </>
      }
    </div>
  )
}

interface EditPageVariationStockFieldProps {
  size: sizeKey;
  selectedVar: ColorKey;
  deletedSizes: sizeKey[];
  setDeletedSizes: Dispatch<SetStateAction<sizeKey[]>>;
  addedSize: sizeKey | null;
  setAddedSize: Dispatch<SetStateAction<sizeKey | null>>;
  setSizesValidityObj: Dispatch<SetStateAction<Record<string, Record<string, boolean>>>>;
}

function EditPageVariationSizeStockContainer({ size, selectedVar, deletedSizes, setDeletedSizes, addedSize, setAddedSize, setSizesValidityObj }: EditPageVariationStockFieldProps) {
  const { productDic, originalProductDic, updateProductDic } = useProductEdit();
  const [isExtended, setIsExtended] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingExtend, setIsClosingExtend] = useState(false);
  const [animContainerHeight, setAnimContainerHeight] = useState<number | undefined>(undefined);
  const [isValid, setIsValid] = useState(CheckSizeValidity(size));
  const sizeNameChart: Record<sizeKey, string> = { 'XS': 'Extra Small', 'S': 'Small', 'M': 'Medium', 'L': 'Large', 'XL': 'Extra Large', 'XXL': 'x2 Extra Large' };
  const animContainerRef = useRef<HTMLDivElement | null>(null);
  const stockFieldContainerRef = useRef<HTMLDivElement | null>(null);
  const batchesArray = productDic?.vars[selectedVar].varSizesQuantity[size];


  useEffect(() => {
    if (!animContainerRef.current) return;

    animContainerRef.current.setAttribute('data-anim', 'open');
    setAddedSize(null);
  }, [animContainerRef]);

  useEffect(() => {
    if (showHidden === false) return;

    const delay = setTimeout(() => {
      setShowHidden(false);
      setIsClosing(false);
    }, 250 + ((150 * (productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.filter(batch => batch.is_active === 0).length ?? 0)) - 150));

    return () => {
      clearTimeout(delay);
    }

  }, [isClosing]);

  useEffect(() => {
    if (isExtended === false) return;

    const delay = setTimeout(() => {
      setIsExtended(false);
      setIsClosingExtend(false);
    }, 200);

    return () => {
      clearTimeout(delay);
    }

  }, [isClosingExtend]);

  useEffect(() => {
    if (deletedSizes.indexOf(size) === -1) return;
    // console.log(deletedSizes);

    const delay = setTimeout(() => {
      updateProductDic(draft => {
        if (!draft) return;

        const varExists = originalProductDic.current?.vars?.[selectedVar];
        const existsOriginally = varExists ? Object.prototype.hasOwnProperty.call(originalProductDic.current?.vars?.[selectedVar]?.varSizesQuantity, size) : false;

        if (existsOriginally) draft.vars[selectedVar].varSizesQuantity[size] = { ...draft.vars[selectedVar].varSizesQuantity[size], is_deleted: 1 };
        else delete draft.vars[selectedVar].varSizesQuantity[size];
      });

      setSizesValidityObj((currObj) => {
        const objCopy = structuredClone(currObj);

        delete objCopy[selectedVar][size];

        return objCopy;
      });

      setDeletedSizes(sizes => sizes.filter(s => s !== size));
    }, 200);

    return () => clearTimeout(delay);
  }, [deletedSizes]);

  useEffect(() => {
    const sizeIsValid = CheckSizeValidity(size);

    setSizesValidityObj(currObj => {
      const objCopy = structuredClone(currObj);

      if (!objCopy[selectedVar]) objCopy[selectedVar] = {};

      objCopy[selectedVar][size] = sizeIsValid;

      return objCopy;
    });

    setIsValid(sizeIsValid);
  }, [batchesArray]);

  useEffect(() => {
    const node = stockFieldContainerRef.current;
    if (!node) return;


    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        // console.log('observing is working! Height: ', e.contentRect.height);
        setAnimContainerHeight(e.contentRect.height);
      }
    });

    ro.observe(node);

    return () => ro.disconnect();
  }, []);




  function CheckSizeValidity(currSize: string): boolean {
    if (!productDic) return false;

    const sizeBatches = productDic?.vars[selectedVar].varSizesQuantity[currSize].stock_batches;

    if (sizeBatches.length < 1) return false;

    for (const { current_available, is_active } of sizeBatches) {
      if (current_available < 1 && is_active === 1) {
        // console.warn('were inside... should return false!!');
        return false;
      }
    }

    // console.warn('reached here... returning true!!');
    return true;
  }





  function HandleAddNewBatch() {
    if (productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.some(batch => batch.batch_id === undefined)) return;

    updateProductDic(draft => {
      if (!draft) return;

      const batchesArray = draft.vars[selectedVar].varSizesQuantity[size].stock_batches;
      draft.vars[selectedVar].varSizesQuantity[size].stock_batches = [...batchesArray, { batch_id: undefined, current_available: 0, total_sales: 0, is_active: 1 } as SizeStockBatch]
    });
  }

  function ToggleIsExtended() {
    if (!isExtended) setIsExtended(true);
    else setIsClosingExtend(true);
  }

  function ToggleBatchShowHide() {
    if (!showHidden) setShowHidden(true);
    else setIsClosing(true);
  }

  return (
    <div className="ep-stock-field-anim-container" ref={addedSize === size ? animContainerRef : null} data-anim={deletedSizes[deletedSizes.indexOf(size)] === size ? 'close' : null}>
      <div className="ep-variation-size-stock-field" data-isextended={isExtended} style={{ maxHeight: isExtended && !isClosingExtend && animContainerHeight ? `${animContainerHeight + 55}px` : '55px', transitionDuration: '0.2s' }}>
        <div className="ep-variation-size-stock-collapsed" onClick={ToggleIsExtended} data-isvalid={isValid}>
          <div className="ep-field-title">
            <p>{`${sizeNameChart[size]} (${size})`}</p>
            <p>{`${selectedVar.startsWith('_') ? '' : selectedVar}-${size}`}</p>
          </div>
          <div className="ep-stock-field-collapsed-arrow-container">
            <p>{`Current available: ${productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.reduce((total, { current_available }) => total + current_available, 0)}`}</p>
            <img className="button-icon" src={ImageUrl('ui-images/small-arrow-icon.svg')} alt="" />
          </div>
        </div>
        <div className="ep-variation-size-stock-extended" ref={stockFieldContainerRef}>
          <div className="ep-batches-add-hide-show-buttons-container">
            <button disabled={!productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.some(batch => batch.is_active === 0)} onClick={ToggleBatchShowHide}>{`${showHidden ? 'Hide' : 'Show'} inactive`}</button>
            <button disabled={productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.some(batch => batch.batch_id === undefined)} onClick={HandleAddNewBatch}>
              <img className="button-icon" src={ImageUrl('ui-images/add-icon.svg')} alt="" />
              <p>New batch</p>
            </button>
          </div>
          {isExtended &&
            <div className="ep-stock-size-batches-table-container">
              <div className="ep-stock-size-batches-table-header">
                <div>
                  <p>Batch ID</p>
                </div>
                <div>
                  <p>Current available</p>
                </div>
                <div>
                  <p>Actions</p>
                </div>
              </div>
              <div className="ep-stock-size-batches-table-body">
                {productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches.filter(batch => showHidden || batch.is_active).map((currBatch) => {
                  return <EditPageStockBatchContainer key={`batch-${selectedVar}-${size}-${currBatch.batch_id}`} batch={currBatch} selectedVar={selectedVar} size={size} isClosing={isClosing} />
                })}
                {productDic!.vars[selectedVar].varSizesQuantity[size].stock_batches.filter(batch => batch.is_active).length < 1 &&
                  <p>No active batches... this size will appear to users as out-of-stock</p>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  )
}

function EditPageStockBatchContainer({ batch, selectedVar, size, isClosing }: { batch: SizeStockBatch; selectedVar: string; size: string; isClosing: boolean }) {
  const { productDic, updateProductDic } = useProductEdit();
  const { setTopLayerIsActive } = usePage();
  const [batchIndex, setBatchIndex] = useState(FindBatchIndex('none'));
  const [value, setValue] = useState(batch.current_available.toString());
  const [isValid, setIsValid] = useState(true);
  const [editEnabled, setEditEnabled] = useState(false);
  const [animFieldButtons, setAnimFieldButtons] = useState<'show' | 'hide'>("hide");
  const animBatchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!animBatchContainerRef.current) return;

    animBatchContainerRef.current.setAttribute('data-anim', 'open');
  }, [animBatchContainerRef]);

  useEffect(() => {
    if ((editEnabled && animFieldButtons === 'show') || (!editEnabled && animFieldButtons === 'hide')) return;

    const delay = setTimeout(() => {
      setEditEnabled(curr => !curr);
    }, 200);

    return () => { clearTimeout(delay); }
  }, [animFieldButtons]);

  useEffect(() => {
    setBatchIndex(FindBatchIndex('none'));
  }, [productDic, selectedVar, size, batch]);

  useEffect(() => {
    if (batchIndex === undefined) return;

    const parsedValue = parseInt(value);

    updateProductDic(draft => {
      if (!draft || !value) return;

      draft.vars[selectedVar].varSizesQuantity[size].stock_batches[batchIndex].current_available = parsedValue;
    });

    setIsValid(parsedValue > 0 && batch.is_active === 1);
  }, [value]);

  function FindBatchIndex(filtered: 'inactive' | 'active' | 'none'): number | undefined {
    const allBatches = productDic?.vars[selectedVar].varSizesQuantity[size].stock_batches;
    if (!allBatches) return undefined;

    let filteredBatches = allBatches;

    if (filtered === 'active') {
      filteredBatches = allBatches.filter(batch => batch.is_active === 1);
    } else if (filtered === 'inactive') {
      filteredBatches = allBatches.filter(batch => batch.is_active === 0);
    }

    return filteredBatches.findIndex(b => b.batch_id === batch.batch_id);
  }

  function HandleBatchDelete() {
    if (batch.batch_id !== undefined) return;

    animBatchContainerRef.current?.setAttribute('data-anim', 'close');

    setTimeout(() => {
      updateProductDic(draft => {
        if (!draft || batchIndex === undefined) return;

        draft.vars[selectedVar].varSizesQuantity[size].stock_batches.splice(batchIndex, 1);
      });
    }, 250);
  }

  function HandleIncreaseButtonClick() {
    setValue(currVal => {
      const val = parseInt(currVal);
      return (val + 1).toString();
    });
  }

  function HandleDecreaseButtonClick() {
    setValue(currVal => {
      const val = parseInt(currVal);
      return (Math.max(val - 1, 0)).toString();
    });
  }

  function HandleValueChange(value: string) {
    const cleanedInput = value.replace(/\D/g, '').replace(/^0+/, '');

    setValue(cleanedInput === '' ? '0' : cleanedInput);
  }

  function ToggleEdit() {
    if (editEnabled) setAnimFieldButtons('hide');
    else setAnimFieldButtons('show');
  }

  function HandleToggleTrue() {
    // console.log('Toggle is: ', true);

    updateProductDic(draft => {
      if (!draft || batchIndex === undefined) return;

      draft.vars[selectedVar].varSizesQuantity[size].stock_batches[batchIndex] = { ...batch, 'is_active': 1 };
    });

    setIsValid(batch.current_available > 0);
  }

  async function HandleToggleFalse() {
    const result = await (() => {
      return new Promise((resolve) => {
        if (batch.batch_id === undefined) setTopLayerIsActive(true, 'dialog', { title: 'Are you sure?', message: "You're about to disable a newly added stock batch. This will store the record but it won't be visible to users. You can always activate it later. Would you like to proceed?", trueButton: "Yes, disable it!" }, resolve);
        else if (productDic!.vars[selectedVar].varSizesQuantity[size].stock_batches.filter(batch => batch.is_active).length > 1) resolve(true);
        else setTopLayerIsActive(true, 'dialog', { title: 'Are you sure?', message: "You're about to disable the last active stock batch. Setting all the batches to inactive will mark the product as out-of-stock. Would you like to proceed?", trueButton: "Yes, disable it!" }, resolve);
      });
    })();
    // console.log(result);

    if (!result) return;

    // console.log('Toggle is: ', false);

    updateProductDic(draft => {
      if (!draft || batchIndex === undefined) return;

      draft.vars[selectedVar].varSizesQuantity[size].stock_batches[batchIndex] = { ...batch, 'is_active': 0 };
    });
    setAnimFieldButtons('hide');

    setIsValid(true);
  }

  return (
    <div className="ep-stock-batch-container" ref={animBatchContainerRef} data-newbatch={batch.batch_id === undefined} data-editenabled={editEnabled} data-isactive={!!batch.is_active} data-anim={!batch.is_active && isClosing ? 'close' : undefined} style={{ animationDelay: isClosing ? `${150 * (FindBatchIndex('inactive') ?? 0)}ms` : '0ms' }}>
      <div>
        <p>{batch.batch_id ?? '#'}</p>
      </div>
      <div className="ep-field-buttons-container" data-anim={batch.batch_id === undefined ? 'show' : animFieldButtons} data-isvalid={isValid}>
        {(editEnabled || batch.batch_id === undefined) &&
          <button disabled={!batch.is_active} onClick={() => { if ((editEnabled && animFieldButtons === 'show') || batch.batch_id === undefined) HandleDecreaseButtonClick() }}>-</button>
        }
        <div>
          <input value={value} type="text" inputMode="numeric" onChange={(e) => { if ((editEnabled && animFieldButtons === 'show') || batch.batch_id === undefined) HandleValueChange(e.currentTarget.value) }} readOnly={(!editEnabled && batch.batch_id !== undefined) || !batch.is_active} />
        </div>
        {(editEnabled || batch.batch_id === undefined) &&
          <button disabled={!batch.is_active} onClick={() => { if ((editEnabled && animFieldButtons === 'show') || batch.batch_id === undefined) HandleIncreaseButtonClick() }}>+</button>
        }
      </div>
      <div className="ep-stock-batch-actions">
        {batch.batch_id !== undefined &&
          <button disabled={!batch.is_active} onClick={ToggleEdit}>
            <img className="button-icon" src={ImageUrl('ui-images/edit-icon.svg')} alt="" />
          </button>
        }
        {batch.batch_id === undefined &&
          <button disabled={!batch.is_active} onClick={HandleBatchDelete}>
            <img className="button-icon" src={ImageUrl('ui-images/x-icon.svg')} alt="" />
          </button>
        }
        <ToggleButton isEditable={batch.current_available > 0 || batch.batch_id === undefined} oriValue={!!batch.is_active} trueAction={() => HandleToggleTrue()} falseAction={() => HandleToggleFalse()} />
      </div>
    </div>
  )
}

function ToggleButton({ isEditable, oriValue, trueAction, falseAction }: { isEditable: boolean; oriValue: boolean; trueAction: () => void; falseAction: () => void }) {
  const [value, setValue] = useState(oriValue);

  // useEffect(() => {
  //     console.log('batch: ', batchid, 'edit is active? ', value);
  // }, []);

  useEffect(() => {
    setValue(oriValue);
  }, [oriValue]);

  function handleCheckBoxToggle() {
    if (!isEditable) return;

    if (value === false) trueAction();
    else falseAction();
  }

  return (
    <div className="modern-checkbox" data-ischecked={!isEditable ? false : value} data-iseditable={isEditable} onClick={handleCheckBoxToggle}>
      <div className="checkbox-handle"></div>
    </div>
  )
}

function EditPageVariationModelContainer({ selectedVar, onValidate }: { selectedVar: ColorKey; onValidate: (isvalid: boolean) => void; }) {
  const { theme } = useTheme();
  const { productDic, attemptedSumbit } = useProductEdit();
  const [image, setImage] = useState(productDic?.vars[selectedVar].model['model-pfp'] ?? undefined);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImage(productDic?.vars[selectedVar].model['model-pfp']);
  }, [selectedVar, productDic?.vars[selectedVar].model]);

  return (
    <>
      <div className="ep-model-select-container">
        <div className="ep-select-fields-container">
          <p>variant model</p>
          <div className="ep-model-image-container">
            <img className="ep-model-image" src={!image ? ImageUrl('ui-images/default-pfp.svg') : ImageUrl(image)} alt="model image" style={{ visibility: imageLoaded ? "visible" : "hidden", filter: imageLoaded && image ? 'none' : theme === 'light' ? 'invert(1) brightness(100)' : 'invert(1) opacity(70%) brightness(100)' }} onLoad={() => setImageLoaded(true)} />
            {!imageLoaded && (
              <img className="loading-image" src={loadingImage} alt="loading" />
            )}
          </div>
          <EditProductSelectField selectFor={'model'} selectedVar={selectedVar} value={!productDic?.vars[selectedVar].model['model-f-name'] || !productDic.vars[selectedVar].model['model-l-name'] ? undefined : `${productDic.vars[selectedVar].model['model-f-name']} ${productDic.vars[selectedVar].model['model-l-name']}`} onValidate={onValidate} />
        </div>
      </div>
      <div className="ep-error-line-container">
        {((!productDic?.vars[selectedVar].model || !productDic.vars[selectedVar].model['model-id']) && attemptedSumbit) &&
          <EditProductErrorLine errorMessage={"You must assign a model for each variant!"} />
        }
      </div>
    </>
  )
}
//                                      ------------------------     Step one     ------------------------
function EditProductPriceFields({ onValidate }: { onValidate: (isvalid: boolean) => void; }) {
  const { productDic, updateProductDic, attemptedSumbit } = useProductEdit();
  const [discountIsActive, setDiscountIsActive] = useState(productDic?.discount_price === undefined ? false : true);
  const [originalPrice, setOriginalPrice] = useState((productDic?.original_price?.toFixed(2))?.toString() ?? '');
  const [discountPrice, setDiscountPrice] = useState((productDic?.discount_price?.toFixed(2))?.toString() ?? '');
  const [originalPriceValid, setOriginalPriceValid] = useState<boolean>(productDic?.original_price ? (productDic.original_price > 0) : false);
  const [discountPriceValid, setDiscountPriceValid] = useState<boolean>((() => {
    if (!productDic || !productDic.discount_price || !productDic.original_price) return false;

    const op = productDic.original_price;
    const dp = productDic.discount_price;

    if (dp > 0 && dp < op) return true;
    else return false;
  }));
  const [disOptionsIsActive, setDisOptionsIsActive] = useState(false);
  const [customDiscountIsActive, setCustomDiscountIsActive] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discPercentageIsValid, setDiscPercentageIsValid] = useState(false);
  const InputsParentRef = useRef<HTMLDivElement | null>(null);
  const oriPriceInputRef = useRef<HTMLInputElement | null>(null);
  const disPriceInputRef = useRef<HTMLInputElement | null>(null)
  const customDiscountInputParentRef = useRef<HTMLDivElement | null>(null);
  const customDiscountInputAnimationDelayRef = useRef<NodeJS.Timeout | null>(null);
  const discountArrowButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!productDic || !productDic.discount_price || !productDic.original_price) return

    ValidateDiscPercentage((100 - (productDic.discount_price / productDic.original_price * 100)).toString()); // if (productDic.discount_price !== undefined || productDic.discount_price !== null) 
  }, []);

  useEffect(() => {
    // console.error('discountIsActive: ' + discountIsActive);
    if (!discountIsActive) {
      setDiscountPrice('');
      updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = undefined;
      });
      setDiscountPercentage(0);
      setCustomDiscountIsActive(false);
      setDiscountPriceValid(true);
      return;
    }
    else {
      InputsParentRef.current?.setAttribute('data-discountactive', 'true');
      if (!productDic?.discount_price) updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = null;
      });
      setDisOptionsIsActive(true);
      setDiscountPriceValid(false);
    }
  }, [discountIsActive]);

  useEffect(() => {
    if (!customDiscountIsActive) return;
    else { customDiscountInputParentRef.current?.setAttribute('data-isactive', 'true'); } //  customDiscountInputRef.current.focus()
  }, [customDiscountIsActive]);

  useEffect(() => {
    if (!customDiscountInputAnimationDelayRef.current) return;

    // console.log('cleared timeout!');
    return () => { if (customDiscountInputAnimationDelayRef.current) clearTimeout(customDiscountInputAnimationDelayRef.current) };
  }, [customDiscountInputAnimationDelayRef]);

  useEffect(() => {
    onValidate((originalPriceValid && discountPriceValid));
  }, [originalPriceValid, discountPriceValid])

  function ToggleDiscountInput() {
    if (!discountIsActive) {
      setDiscountIsActive(true);
    } else {
      InputsParentRef.current?.setAttribute('data-discountactive', 'false');

      discountArrowButton.current?.setAttribute('data-isactive', 'false');
      setDisOptionsIsActive(false);

      setTimeout(() => setDiscountIsActive(false), 200);
    }
  }

  function DisableCustomDiscount() {
    if (customDiscountIsActive) {
      customDiscountInputParentRef.current?.setAttribute('data-isactive', 'false');
      const delay = setTimeout(() => setCustomDiscountIsActive(false), 175);
      customDiscountInputAnimationDelayRef.current = delay;
    }
  }

  function ValidateDiscPercentage(val: string, fromInput = false) {
    const percentage = parseFloat(val.replace(/[^\d.]/g, ""));

    UpdateDiscountPercentage(percentage, fromInput);
    if ((percentage).toString().length < 1 || (percentage <= 0 || percentage >= 100))
      setDiscPercentageIsValid(false);
    else
      setDiscPercentageIsValid(true);
  }

  function formatPrice(value: string) {
    const cleanedInput = value.replace(/\D/g, "");
    const paddedInput = cleanedInput.replace(/^0+/, '').padStart(3, "0");

    return `${paddedInput.slice(0, paddedInput.length - 2)}.${paddedInput.slice(-2)}`;
  }

  function HandleOriginalPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    const formattedValue = formatPrice(value);
    const float = parseFloat(formattedValue);

    setOriginalPriceValid(float > 0);

    setOriginalPrice(formattedValue);
    updateProductDic(draft => {
      if (!draft) return;

      draft.original_price = float;
    });

    if (discountPercentage !== 0) {
      const price = (float - float * discountPercentage / 100).toFixed(2);
      setDiscountPrice(price);
      updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = parseFloat(price);
      });
    }
  }

  function HandleDiscountPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    const formattedValue = formatPrice(value);
    const opf = parseFloat(originalPrice);

    const float = parseFloat(formattedValue);

    setDiscountPriceValid((float <= 0 || float >= opf) ? false : true);

    setDiscountPrice(formattedValue);
    updateProductDic(draft => {
      if (!draft) return;

      draft.discount_price = float;
    });
    // console.log((float / originalPrice * 100));
    ValidateDiscPercentage((100 - float / opf * 100).toString());
  }

  function handleArrowKeys(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  }

  function ResizeInputFont() {
    let newFontSize = 50;

    if (!oriPriceInputRef.current || oriPriceInputRef.current.value.length < 1) return `${newFontSize}px`;

    const oriInputBigger = disPriceInputRef.current && (disPriceInputRef.current.value.length > oriPriceInputRef.current.value.length) ? false : true;

    oriPriceInputRef.current.style.fontSize = '50px';
    if (disPriceInputRef.current) disPriceInputRef.current.style.fontSize = '50px';

    const inputsWidth = oriPriceInputRef.current.offsetWidth;
    const textWidth = oriInputBigger ? oriPriceInputRef.current.scrollWidth : disPriceInputRef.current ? disPriceInputRef.current.scrollWidth : oriPriceInputRef.current.scrollWidth; // Get the input width

    const inputEl = oriInputBigger ? oriPriceInputRef.current : disPriceInputRef.current;

    if (inputEl) {
      const computedFontSize = parseInt(window.getComputedStyle(inputEl).fontSize);
      newFontSize = Math.min((inputsWidth / textWidth) * computedFontSize, 50);
    }

    return `${newFontSize}px`;
  };


  function UpdateDiscountPercentage(percentage: number, fromInput = false) {
    const p = isNaN(percentage) ? 0 : percentage;
    const opf = parseFloat(originalPrice);
    const price = (isNaN(opf) ? 0 : opf - opf * p / 100).toFixed(2);

    if (p === 10 || p === 20 || p === 30 || p === 40 || p === 50) {
      if (customDiscountIsActive) DisableCustomDiscount();
      setDiscountPrice(price);
      updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = parseFloat(price);
      });
    } else {
      setCustomDiscountIsActive(true);
    }

    setDiscountPercentage(p);
    if (fromInput && (!isNaN(opf) && opf > 0)) {

      setDiscountPrice(price);
      updateProductDic(draft => {
        if (!draft) return;

        draft.discount_price = parseFloat(price);
      });
    }
  }


  useEffect(() => {
    if (!oriPriceInputRef.current) return;

    const fs = ResizeInputFont();
    oriPriceInputRef.current.style.fontSize = fs;
    if (disPriceInputRef.current) {
      disPriceInputRef.current.style.fontSize = fs;
      const dFloat = parseFloat(disPriceInputRef.current.value);
      const oFloat = parseFloat(originalPrice);
      // console.log(dFloat);
      setDiscountPriceValid((dFloat <= 0 || dFloat >= oFloat || isNaN(dFloat)) ? false : true);
    }
  }, [originalPrice, discountPrice]);

  return (
    <div className="ep-price-inputs-section">
      <div className="ep-price-inputs-container" ref={InputsParentRef} data-discountactive={discountIsActive}>
        <div className="ep-original-price-input-container">
          <p className="ep-price-title">original price</p>
          <p className="ep-price-currency">$</p>
          <input ref={oriPriceInputRef} type="text" inputMode="numeric" name="op-input" placeholder="0.00" value={originalPrice} data-isvalid={originalPriceValid} onKeyDown={handleArrowKeys} onChange={(e) => HandleOriginalPriceChange(e)} />
        </div>
        <button className="ep-price-toggle-discount-button" data-isactive={discountIsActive} onClick={() => ToggleDiscountInput()}>
          <img className='button-icon' src={ImageUrl(discountIsActive ? 'ui-images/sale-icon-fill.svg' : 'ui-images/sale-icon-outline.svg')} alt="" />
        </button>
        {discountIsActive &&
          <div className="ep-discount-price-input-container" >
            <p className="ep-price-title">discount price</p>
            <p className="ep-price-currency">$</p>
            <input ref={disPriceInputRef} type="text" inputMode="numeric" name="dp-input" placeholder="0.00" value={discountPrice} data-isvalid={discountPriceValid} onKeyDown={handleArrowKeys} onChange={(e) => HandleDiscountPriceChange(e)} />
          </div>
        }
        <div className="ep-error-line-container">
          {(parseFloat(originalPrice) <= 0.00 || (attemptedSumbit && originalPrice === '')) &&
            <EditProductErrorLine errorMessage={"The original price field must contain a positive value."} />
          }
          {((parseFloat(discountPrice) <= 0.00 && discountIsActive) || (attemptedSumbit && originalPrice === '' && discountIsActive)) &&
            <EditProductErrorLine errorMessage={"The discount price field must contain a positive value."} />
          }
          {parseFloat(originalPrice) <= parseFloat(discountPrice) &&
            <EditProductErrorLine errorMessage={"The discount price field must have a lower value than the original price."} />
          }
        </div>
      </div>
      {discountIsActive &&
        <div className="ep-price-discount-options-container" data-isvisible={disOptionsIsActive.toString()} data-isactive={discountIsActive}>
          <hr />
          <div className="ep-price-discount-options">
            <button data-isactive={discountPercentage === 10 ? 'true' : 'false'} onClick={() => UpdateDiscountPercentage(10)}>10%</button>
            <button data-isactive={discountPercentage === 20 ? 'true' : 'false'} onClick={() => UpdateDiscountPercentage(20)}>20%</button>
            <button data-isactive={discountPercentage === 30 ? 'true' : 'false'} onClick={() => UpdateDiscountPercentage(30)}>30%</button>
            <button data-isactive={discountPercentage === 40 ? 'true' : 'false'} onClick={() => UpdateDiscountPercentage(40)}>40%</button>
            <button data-isactive={discountPercentage === 50 ? 'true' : 'false'} onClick={() => UpdateDiscountPercentage(50)}>50%</button>
            <button data-isactive={(!customDiscountIsActive && discountPercentage === 0) || discountPercentage === 10 || discountPercentage === 20 || discountPercentage === 30 || discountPercentage === 40 || discountPercentage === 50 ? 'false' : 'true'} onClick={() => { if (!customDiscountIsActive) setCustomDiscountIsActive(true); }}>
              <img className='button-icon' src={ImageUrl('ui-images/edit-icon.svg')} alt='' />
              {customDiscountIsActive &&
                <div data-isactive={'true'} ref={customDiscountInputParentRef}>
                  <input type="text" inputMode="numeric" name="custom-percentage-input" data-isvalid={discPercentageIsValid} value={discountPercentage} onKeyDown={handleArrowKeys} onChange={(e) => ValidateDiscPercentage(e.target.value, true)} />
                  %
                </div>
              }
            </button>
          </div>
          <button ref={discountArrowButton} onClick={() => setDisOptionsIsActive(!disOptionsIsActive)}>
            <img className='button-icon' src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
          </button>
        </div>
      }
    </div>
  )
}

function EditProductNameInputField({ title, onValidate }: { title: string; onValidate: (isvalid: boolean) => void; }) {
  const { productDic, updateProductDic, attemptedSumbit } = useProductEdit();
  const [inputFieldValue, setInputFieldValue] = useState((productDic?.name_en) ?? '');
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef) return;

    const allowedletters = /^[0-9a-zA-Z\s\-_]+$/;
    const productName = inputFieldValue.trim();

    const isVal = (!productName.match(allowedletters) || productName.length < 1) ? false : true;

    setIsValid(isVal);
    onValidate(isVal);
  }, [inputFieldValue]);

  function HandleValueChange(value: string) {
    setInputFieldValue(value);
    updateProductDic(draft => {
      if (!draft) return;

      draft.name_en = value;
    });
  }

  return (
    <div className="ep-general-info-input-section" data-errorshow={attemptedSumbit.toString()} data-isvalid={isValid.toString()} data-isfilled={(inputFieldValue.length < 1) ? 'false' : 'true'}>
      <p className="ep-section-title">{title}</p>
      <input type="text" ref={inputRef} value={inputFieldValue} onChange={(e) => HandleValueChange(e.target.value)} />
    </div>
  )
}

interface EditProductSelectFieldProps {
  selectFor: string;
  value?: string | null | undefined;
  selectedVar?: ColorKey;
  setSelectedVar?: React.Dispatch<SetStateAction<string | undefined>>;
  replaceValidityKeys?: (oldVar: string, newVar: string) => void;
  onValidate: (isvalid: boolean) => void;
}

function EditProductSelectField({ selectFor, value, selectedVar, setSelectedVar, replaceValidityKeys, onValidate }: EditProductSelectFieldProps) {
  const { setFourthLayerPageIsActive } = usePage();
  const { productDic, originalProductDic, updateProductDic, varNumber, setVarNumber, attemptedSumbit } = useProductEdit();
  const [selectedValue, setSelectedValue] = useState(value ? value : value === null ? null : undefined);
  const [selectedCC, setSelectedCC] = useState(selectedVar);
  const [selectedModel, setSelectedModel] = useState(productDic?.vars[selectedVar as ColorKey]?.model);
  const [isValid, setIsValid] = useState(value ? true : nullableAttributes.has(selectFor) ? true : false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    onValidate(isValid);
  }, [isValid]);

  useEffect(() => {
    if (selectFor === 'color' || selectFor === 'model') {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (selectFor !== 'color') return;

    // Check if it is a color change or a new color
    const colorExists = (() => {
      if (!originalProductDic.current || !selectedVar) return undefined;

      return Object.prototype.hasOwnProperty.call(originalProductDic.current.vars, selectedVar);
    })();

    if (colorExists === undefined) return;

    updateProductDic(draft => {
      if (!draft || !selectedVar) return;

      if (colorExists) {
        // console.log('--- Color already exists. Changing color name...');
        const newVals = (() => {
          if (!selectedCC || !selectedValue || selectedCC === selectedVar) return { sc: undefined, name: undefined };

          return { sc: selectedCC, name: selectedValue }
        })();

        draft.vars[selectedVar].new_color = newVals;
      } else {
        // console.log('--- This is a new color. Setting the var name...');

        const currentVar = draft.vars[selectedVar];
        if (selectedCC) {
          if (!selectedValue) return;

          draft.vars[selectedCC] = currentVar;
          draft.vars[selectedCC]['color-name'] = selectedValue;
        } else {
          draft.vars[`_${varNumber}`] = currentVar;
          draft.vars[`_${varNumber}`]['color-name'] = undefined;
        }
        delete draft.vars[selectedVar];
      }
    });

    if (colorExists === false) {
      // console.log('keys should be replaced');
      if (selectedVar && replaceValidityKeys) replaceValidityKeys(selectedVar, selectedCC ?? `_${varNumber}`);

      if (setSelectedVar) setSelectedVar(selectedCC ?? `_${varNumber}`);
      setVarNumber(varNumber + 1);
    }
  }, [selectedCC]);

  useEffect(() => {
    if (selectFor !== 'model') return;
    // console.error(selectedVar);

    updateProductDic(draft => {
      if (!draft || !selectedVar) return;

      draft.vars[selectedVar as ColorKey].model = (selectedModel === undefined ? { ...defaultModelDic } : selectedModel);
    });
  }, [selectedModel]);

  useEffect(() => {
    setIsValid(selectedValue ? true : ((nullableAttributes.has(selectFor) && selectedValue === null)) ? true : false)
    if (selectFor === 'color' || selectFor === 'model') return;

    // console.log('lmao 11111');

    const sf = selectFor.replace(' ', '_');
    // console.log(selectedValue, productDic.attributes[sf]);
    if (selectedValue === productDic?.attributes[sf as keyof ProductData["attributes"]]) return

    updateProductDic(draft => {
      if (!draft) return;

      draft.attributes[sf as keyof ProductData["attributes"]] = selectedValue;
    });

    // console.log('updated dic successfully!!');
  }, [selectedValue]);

  const disabledColors = (() => {
    const disColorArray: string[] = [];

    if (!productDic) return disColorArray;

    Object.entries(productDic.vars).forEach(([varSC, varInfo]) => {
      if (varSC !== selectedVar) disColorArray.push(varSC);
      if (varInfo.new_color.sc && varSC !== selectedVar) disColorArray.push(varInfo.new_color.sc);
    });

    return disColorArray
  })();

  return (
    <div className="ep-general-info-select-section" data-isvalid={isValid.toString()}>
      <button data-isfilled={selectedValue === undefined ? 'false' : 'true'} onClick={() => setFourthLayerPageIsActive(true, <SelectOptionPage selectFor={selectFor} addEnabled={selectFor === 'model' ? false : true} selectedValue={selectedValue} setSelectedValue={setSelectedValue} setSelectedCC={setSelectedCC} disabledColors={disabledColors} setSelectedModel={setSelectedModel} />)}>
        <p className="ep-select-title" data-errorshow={attemptedSumbit.toString()} data-isvalid={isValid.toString()}>{selectFor === 'model' ? 'model' : selectFor}</p>
        <p className="ep-select-value">{selectedValue === undefined ? 'select' : selectedValue}</p>
        <img className='button-icon' src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
      </button>
    </div>
  )
}

function EditProductExtraInputField({ onValidate }: { onValidate: (isvalid: boolean) => void; }) {
  const { productDic, updateProductDic } = useProductEdit();
  const [inputValue, setInputValue] = useState(productDic?.attributes.extra ?? '');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef) return;

    const allowedletters = /^[0-9a-zA-Z\s\-_,.]+$/;
    const inputFieldValue = inputRef.current?.value.trim();

    const val = (inputValue === null || inputValue === '') ? true : (!inputFieldValue?.match(allowedletters) ? false : true); // (inputFieldValue.match(allowedletters) || inputValue === null) ? true : false;

    setIsValid(val);
    onValidate(val);
  }, [inputValue]);

  function HandleValueChange(value: string) {
    setInputValue(value);
    updateProductDic(draft => {
      if (!draft) return;
      draft.attributes.extra = value === '' ? null : value;
    });
  }

  return (
    <div className="ep-general-info-select-section">
      <button data-isfilled={inputValue === '' ? 'false' : 'true'} onClick={() => inputRef.current?.focus()}>
        <p className="ep-input-title" data-isvalid={isValid.toString()}>{'Extra details'}</p>
        <input className="ep-input-value" type="text" value={inputValue} ref={inputRef} placeholder="belted, ruffle hem, zippers, etc..." onChange={(e) => HandleValueChange(e.target.value)} />
        <img className='button-icon' src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='' />
      </button>
    </div>
  )
}

function EditProductErrorLine({ errorMessage, centerLine }: { errorMessage: string; centerLine?: boolean }) {
  return (
    <div className="ep-error-line" style={{ justifyContent: centerLine ? "center" : undefined, textWrap: centerLine ? "nowrap" : undefined }}>
      <img src={ImageUrl('ui-images/exclamation-icon.svg')} alt="" />
      <p>{errorMessage}</p>
    </div>
  )
}