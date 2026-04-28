import { createContext, useContext, useState, useRef, useCallback, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { useImmer, type Updater } from "use-immer";
import type { ProductData } from 'shared/types/ProductTypes.ts';

interface ProductEditContextType {
    edit: boolean;
    setEdit: Dispatch<SetStateAction<boolean>>;
    currentStep: number;
    setCurrentStep: Dispatch<SetStateAction<number>>;
    originalProductDic: React.RefObject<ProductData | null | undefined>;
    productDic: ProductData | undefined;
    updateProductDic: Updater<ProductData | undefined>;
    stepsValidityObj: Record<StepKey, boolean>;
    setStepValidity: (stepName: StepKey, isValid: boolean) => void;
    varNumber: number;
    setVarNumber: Dispatch<SetStateAction<number>>;
    attemptedSumbit: boolean;
    setAttemptedSubmit: Dispatch<SetStateAction<boolean>>;
    blobUrls: string[];
}

const ProductEditContext = createContext<ProductEditContextType | undefined>(undefined);

type StepKey = 'step0' | 'step1' | 'step2';

export default function ProductEditProvider({ children }: {children : ReactNode}) {
    const [edit, setEdit] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [productDic, updateProductDic] = useImmer<ProductData | undefined>(undefined);
    const [stepsValidityObj, setStepsValidityObj] = useState<Record<StepKey, boolean>>({ 'step0' : false, 'step1' : false, 'step2' : false });
    const [varNumber, setVarNumber] = useState(0); // newly added vars
    const [attemptedSumbit, setAttemptedSubmit] = useState(false); // activate on step 5
    const originalProductDicRef = useRef<ProductData | null | undefined>(null);
    const blobUrls: string[] = [];
    
    const setStepValidity = useCallback((stepName: StepKey, isValid: boolean) => {
        setStepsValidityObj(prev => ({
            ...prev,
            [stepName]: isValid
        }));
    }, []);

    // useEffect(() => {
    //     console.log(stepsValidityObj);
    // }, [stepsValidityObj]);

    return(
        <ProductEditContext.Provider value={{
            edit,
            setEdit,
            currentStep,
            setCurrentStep,
            originalProductDic: originalProductDicRef,
            productDic,
            updateProductDic,
            stepsValidityObj,
            setStepValidity,
            varNumber,
            setVarNumber,
            attemptedSumbit,
            setAttemptedSubmit,
            blobUrls,
        }}>
            {children}
        </ProductEditContext.Provider>
    )
}

// export const useProductEdit = () => useContext(ProductEditContext);
export const useProductEdit = () => {
  const context = useContext(ProductEditContext);
  if (!context) throw new Error("useProductEdit must be used inside ProductEditContext.Provider");
  return context;
};


export const nullableAttributes = new Set([
    'sleeve type',
    'sleeve length',
    'neckline',
    'neck height',
    'collection',
    'waist line',
    'hem shape',
]);