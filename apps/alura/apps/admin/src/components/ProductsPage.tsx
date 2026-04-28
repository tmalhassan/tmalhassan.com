import loadingImage from '../../../../shared/assets/loading.gif';
import { usePage } from '../contexts/PageContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useDataFetch from '../hooks/useDataFetch';
import type { ColorKey, FetchedProductData, ProductData, ProductPreview, sizeKey, SizeStockBatch } from 'shared/types/ProductTypes.ts';
import SortSizes from '../tools/SortSizes';
import SplitProductImages from '../tools/SplitProductImages';
import ImageUrl from '../tools/ImageUrl';
import { API_ROUTES } from "../../../../shared/constants/apiRouts.ts";
import serializeParams from '../tools/SerializeParams.ts';
import { useNotificationManager } from './NotificationManager.tsx';
import SimpleLoading from './SimpleLoading.tsx';

const RESULTS_LENGTH = 12;

export function ProductsPage({ searchInputValue, searchActive }: { searchInputValue?: string; searchActive?: boolean }) {
  const { refreshAppContainer, secondLayerPageIsActive } = usePage();
  const [allProducts, setAllProducts] = useState<ProductPreview[]>([]);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(true);
  const [isResultEnd, setIsResultEnd] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<number, boolean>>({});
  const { data, loading, error, sendData } = useDataFetch<ProductPreview[]>(false, API_ROUTES.PRODUCTS.SEARCH, serializeParams({
    page, // searchQuery.page,
    words: [] // searchQuery.words
  }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(isFetching);
  const isResultEndRef = useRef(isResultEnd);
  const nodeIndexMap = useRef(new Map<HTMLDivElement, number>());
  const sectionsNodesRef = useRef<Record<number, HTMLDivElement>>({});
  const lastFetchedPageRef = useRef<number | null>(null);

  const sectionedProducts = useMemo(() => {
    return DivideIntoSections(allProducts, RESULTS_LENGTH);
  }, [allProducts]);

  useEffect(() => { isFetchingRef.current = isFetching; }, [isFetching]);
  useEffect(() => { isResultEndRef.current = isResultEnd; }, [isResultEnd]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const setLoadMoreNode = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isFetchingRef.current && !isResultEndRef.current) {
          isFetchingRef.current = true; // block until done
          setIsFetching(true);

          // console.log('intersectinggggg!');

          setPage(prev => prev + 1);
        }
      }, { rootMargin: '0px 0px 50% 0px', threshold: 0 }
    );

    observerRef.current.observe(node);
  }, []);


  const sectionObserver = useMemo(() => {
    return new IntersectionObserver((entries) => {
      setVisibleSections((prev) => {
        const updated = { ...prev };
        let changed = false;

        for (const entry of entries) {
          const index = nodeIndexMap.current.get(entry.target as HTMLDivElement);
          if (index === undefined) continue;

          const isVisible = entry.isIntersecting;
          if (updated[index] !== isVisible) {
            updated[index] = isVisible;
            changed = true;
          }
        }

        return changed ? updated : prev;
      });
    }, { rootMargin: '0px 0px 10% 0px', threshold: 0 });
  }, []);

  // Attach/detach node refs
  const setSectionRef = useCallback((node: HTMLDivElement | null, sectionIndex: number) => {
    if (node) {
      // Add to maps
      nodeIndexMap.current.set(node, sectionIndex);
      sectionsNodesRef.current[sectionIndex] = node;
      sectionObserver.observe(node);
    } else {
      // Clean up on unmount
      const oldNode = sectionsNodesRef.current[sectionIndex];
      if (oldNode) {
        sectionObserver.unobserve(oldNode);
        nodeIndexMap.current.delete(oldNode);
        delete sectionsNodesRef.current[sectionIndex];
      }
    }
  }, [sectionObserver]);

  useEffect(() => {
    if (lastFetchedPageRef.current === null) return;

    // console.log(data);

    const dataAppend = data ?? [];
    setAllProducts(prev => [...prev, ...dataAppend]);
    isFetchingRef.current = false;
    setIsFetching(false);
    if ((dataAppend.length < RESULTS_LENGTH) && allProducts.length > 0) {
      setIsResultEnd(true);
    }
  }, [data]);

  useEffect(() => {
    // console.log('fetching data for page: ', page, 'and words: ', getSanitizedWords(searchInputValue));
    lastFetchedPageRef.current = page;
    sendData(serializeParams({ page: page, words: getSanitizedWords(searchInputValue) }));
  }, [page]);


  useEffect(() => {
    if (refreshAppContainer === 0) return;

    sendData(serializeParams({ page: 1, words: [] }));

  }, [refreshAppContainer]);

  useEffect(() => {
    if (!searchActive || searchInputValue === undefined) return;

    const delay = setTimeout(() => {
      setAllProducts([]);
      setIsResultEnd(false);
      setPage(1);
    }, 750);

    return () => clearTimeout(delay);
  }, [searchInputValue]);

  function getSanitizedWords(input?: string) {
    if (!input) return [];

    const sanitized = input.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    return sanitized === '' ? undefined : sanitized.split(/\s+/);
  }

  function DivideIntoSections(arr: ProductPreview[], size: number) {
    const result = [];

    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }

    return result;
  }

  return (
    <div className="products-page" inert={secondLayerPageIsActive.isActive}>
      {((allProducts.length < 1) && !loading && !error) ?
        <p className='results-end-message'>No results match your search words... change your entries and try again!</p>
        :
        <div className="products-list-container" ref={containerRef}>
          {/* check for the length to prevent error on null */}
          {sectionedProducts.map((productsInSection, sectionIndex) =>
            <ProductsListContainerSection key={sectionIndex} ref={(node) => setSectionRef(node, sectionIndex)} productsInSection={productsInSection} isVisible={visibleSections[sectionIndex]} />
          )}
          <div className='load-more-section' ref={setLoadMoreNode} data-isactive={loading}>
            <SimpleLoading endAnim={false} />
          </div>
        </div>
      }
      {isResultEnd && <p className='results-end-message'>You've reached the end of the results</p>}
      {loading || error && <img className="loading-image" src={loadingImage} alt='loading' />}
    </div>
  )
}




function ProductsListContainerSection({ productsInSection, isVisible, ref }: { productsInSection: ProductPreview[]; isVisible: boolean; ref: (node: HTMLDivElement) => void }) {
  return (
    <div className='products-list-section' ref={ref}>
      {productsInSection.map((product, id) => {
        return <ProductCardGridTemplate key={id} productInfo={product} isVisible={isVisible} />
      })}
    </div>
  )
}

function ProductCardGridTemplate({ productInfo, isVisible }: { productInfo: ProductPreview; isVisible: boolean }) {
  const { thirdLayerPageIsActive, tlIsClosing, setCurrentProductInView, setSecondLayerPageIsActive } = usePage();
  const [selectedVarForView, setSelectedVarForView] = useState(Object.keys(productInfo.vars)[Math.floor(Math.random() * (Object.keys(productInfo.vars).length))]);
  const isFirstRender = useRef(true);

  function HandleProductButtonClick() {
    setSecondLayerPageIsActive(true, <ProductViewPage productID={productInfo.id} />);
    setCurrentProductInView({ productID: productInfo.id, is_deleted: productInfo.is_deleted });
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSelectedVarForView(Object.keys(productInfo.vars)[Math.floor(Math.random() * (Object.keys(productInfo.vars).length))]);
  }, [productInfo.id]);

  return (
    <button className="product-card-grid-template" onClick={() => HandleProductButtonClick()}>
      <div className="card-images-container">
        {isVisible &&
          <>
            <img src={ImageUrl(`products/${productInfo.id}/${productInfo.id}${selectedVarForView}/${0}-thumb.webp`)} alt={`product ${productInfo.id} preview image`} style={{ display: (thirdLayerPageIsActive.isActive && !tlIsClosing) ? 'none' : 'initial' }} />
            {Object.keys(productInfo.vars).length > 1 &&
              <div className='card-vars-colors-swatches'>
                {Object.keys(productInfo.vars).map((varCC, index) => {
                  if (index <= 2 || (Object.keys(productInfo.vars).length === 4 && index === 3)) return (
                    <div key={productInfo.id + varCC + index} className='card-var-color-swatch'>
                      <img src={ImageUrl(`products/${productInfo.id}/${productInfo.id}${varCC}.webp`)} alt="" style={{ display: (thirdLayerPageIsActive.isActive && !tlIsClosing) ? 'none' : 'initial' }} />
                    </div>
                  )
                })}
                {Object.keys(productInfo.vars).length > 4 &&
                  <div className='card-var-number-swatch'>{`+${Object.keys(productInfo.vars).length - 3}`}</div>
                }
              </div>
            }
          </>
        }
      </div>
      <div className="card-product-title-id-container">
        <p className="title">{productInfo.name_en}</p>
        <span>{`ID: ${productInfo.id}`}</span>
      </div>
      <div className='pv-price-container'>
        {productInfo['discount_price'] !== null && productInfo['discount_price'] && productInfo['original_price'] ?
          <>
            <p className='pv-dis-price'>{`$${(productInfo['discount_price'].toFixed(2))}`}</p>
            <p className='pv-ori-price'>{`$${(productInfo['original_price'].toFixed(2))}`}</p>
            <p className='pv-dis-percentage'>{`${(((productInfo['discount_price'] - productInfo['original_price']) * 100) / productInfo['original_price']).toString().split('.')[0]}%`}</p>
          </>
          :
          <p className='pv-price'>{`$${(productInfo['original_price']?.toFixed(2))}`}</p>
        }
      </div>
      <ul className="card-sizes-container">
        {SortSizes(productInfo.sizes).map((size, i) => {
          return (
            <li key={i}>
              <p>{size}</p>
            </li>
          )
        })}
      </ul>
    </button>
  )
}

const colors = [
  ['#9d7aff', '#e57eff'],
  ['#ffcd82', '#b6d94a'],
  ['#FFA69E', '#bb3b85'],
  ['#ff7a7a', '#ffb080'],
  ['#7ad0fe', '#7e90ff'],
  ['#4ae68e', '#4ce5d4'],
  ['#44B09E', '#E0D2C7'],
]

function ProductViewPage({ productID }: { productID: number }) {
  const { Notify } = useNotificationManager();
  const { data, loading, sendData } = useDataFetch<FetchedProductData[]>(true, API_ROUTES.PRODUCTS.GET_PRODUCT, serializeParams({ id: productID }));
  const { theme } = useTheme();
  const { secondLayerPageIsActive, tlIsClosing, thirdLayerPageIsActive, setTopLayerIsActive } = usePage();
  const [productDic, setProductDic] = useState<ProductData | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<sizeKey | null>(null);
  const [pieIsInView, setPieIsInView] = useState(false);
  const [numsIsInView, setNumsIsInView] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [colorsList, setColorsList] = useState<Record<ColorKey, string[]> | null>(null);
  const [overrideStyle, setOverrideStyle] = useState(false);
  const buttonsContainerRef = useRef<HTMLUListElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pieRef = useRef<HTMLDivElement | null>(null);
  const numsRef = useRef<HTMLDivElement | null>(null);
  const isFirstRenderRef = useRef(true);

  const restartAnimation = () => {
    if (!pieIsInView) return
    setAnimationKey(prevKey => prevKey + 1);
    setPieIsInView(false);
    const delay = setTimeout(() => {
      setPieIsInView(true);
    }, 10);

    return () => clearTimeout(delay);
  };

  useEffect(() => {
    if (secondLayerPageIsActive.refreshPage === 0) return;

    // console.log('this is refresh number: ', secondLayerPageIsActive.refreshPage);
    sendData(serializeParams({ id: productID }));
    setSelectedVar(null);
  }, [secondLayerPageIsActive.refreshPage]);

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
    if (!data) return;

    setProductDic(SplitProductImages(data[0]));
  }, [data])

  useEffect(() => {
    if (!productDic) return;
    // console.warn(productDic);

    setSelectedVar(Object.keys(productDic.vars)[0]);
    setSelectedSize(SortSizes(Object.keys(productDic.vars[Object.keys(productDic.vars)[0]].varSizesQuantity) as sizeKey[])[0]);

    const tempColors = [...colors];
    const generatedList: Record<ColorKey, string[]> = {};
    for (let i = 0; i < Object.keys(productDic.sizes).length; i++) {
      const s = Math.floor(Math.random() * tempColors.length);
      generatedList[Object.keys(productDic.sizes)[i]] = tempColors[s];
      tempColors.splice(s, 1);
    }
    // console.log(generatedList);
    setColorsList(generatedList);


    if (!isFirstRenderRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = buttonsContainerRef.current;
        if (!el) return;

        const width = el.getBoundingClientRect().width;
        const fullWidth = el.scrollWidth + el.scrollLeft;

        setOverrideStyle(fullWidth > Math.ceil(width));
        isFirstRenderRef.current = false;
      });
    });
  }, [productDic]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === pieRef.current && entry.isIntersecting && pieIsInView === false) {
          // console.log('pie in view!');
          setPieIsInView(true);
          observerRef.current?.unobserve(entry.target);
        }
        if (entry.target === numsRef.current && entry.isIntersecting) {
          // console.log('nums in view!');
          setNumsIsInView(true);
          observerRef.current?.unobserve(entry.target);
        }
      });
    }, { rootMargin: '19%', threshold: 1 });
  }, []);

  useEffect(() => {
    if (!selectedVar) return

    if (pieRef.current) observerRef.current?.observe(pieRef.current);
    if (numsRef.current) observerRef.current?.observe(numsRef.current);

    return () => observerRef.current?.disconnect();

  }, [selectedVar]);

  const { currentTotal, totalSales, strokeOffsetValue } = useMemo(() => {
    if (!selectedVar || !selectedSize) return { currentTotal: 0, totalSales: 0, strokeOffsetValue: 0 };

    const stockBatches: SizeStockBatch[] = productDic?.vars[selectedVar]?.varSizesQuantity?.[selectedSize].stock_batches || [];

    const currentTotal = stockBatches.reduce((sum, { current_available }) => sum + current_available, 0);
    const totalSales = stockBatches.reduce((sum, { total_sales }) => sum + total_sales, 0);
    const total = currentTotal + totalSales;
    const strokeOffsetValue = 1182 - (1182 * (total === 0 ? 0 : currentTotal / total));

    return { currentTotal, totalSales, strokeOffsetValue };
  }, [productDic, selectedVar, selectedSize]);

  function HandleImageClick(image: string | null | undefined, imgIndex: number) {
    if (!image) return;
    else image = ImageUrl(`products/${productID}/${productID}${selectedVar}/${imgIndex}.webp`);

    setTopLayerIsActive(true, 'view', { image }, null);
  }

  return (
    <div className='product-view-page' style={{ display: (thirdLayerPageIsActive.isActive && !tlIsClosing) ? 'none' : 'flex' }}>
      {!selectedVar || !selectedSize || !productDic || loading ?
        <>
          <img className="loading-image" src={loadingImage} alt='loading' />
        </>
        :
        <>
          <ul className='pv-images-container'>
            {(productDic.vars[selectedVar]['var-imgs']) && productDic.vars[selectedVar]['var-imgs'].map((image, id) => {
              return (
                <li key={id} onClick={() => HandleImageClick(image.link, id)}>
                  <img src={image.link ? ImageUrl(image.link) : undefined} alt={`variation image ${id + 1}`} style={{ display: (thirdLayerPageIsActive.isActive && !tlIsClosing) ? 'none' : 'initial' }} />
                </li>
              )
            })}
          </ul>
          <div className='pv-info-container'>
            <div className='pv-price-container'>
              {productDic['discount_price'] !== null && productDic['discount_price'] && productDic['original_price'] ?
                <>
                  <p className='pv-dis-price'>{`$${(productDic['discount_price'].toFixed(2))}`}</p>
                  <p className='pv-ori-price'>{`$${(productDic['original_price'].toFixed(2))}`}</p>
                  <p className='pv-dis-percentage'>{`${(((productDic['discount_price'] - productDic['original_price']) * 100) / productDic['original_price']).toString().split('.')[0]}%`}</p>
                </>
                :
                <p className='pv-price'>{`$${(productDic['original_price']?.toFixed(2))}`}</p>
              }
            </div>
            <p className='pv-name'>{productDic['name_en']}</p>
            <div className='pv-sku-container'>
              <p className='pv-sku'>{`SKU: ${(productDic['id'] ? productDic['id'].toString().padStart(10, "0") : '') + selectedVar + selectedSize}`}</p>
              <button onClick={() => { navigator.clipboard.writeText((productDic['id'] ? productDic['id'].toString().padStart(10, "0") : '') + selectedVar + selectedSize); Notify({ type: 'default', message: 'Copied to clipboard', duration: 2000 }); }}>
                <img className='button-icon' src={ImageUrl('ui-images/copy-icon.svg')} alt='' />
                <p>copy</p>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', width: '100%' }}>
            <span style={{ flex: 1 }}></span>
            <ul className='pv-vars-buttons-container' ref={buttonsContainerRef} style={{ justifyContent: overrideStyle ? 'flex-start' : 'space-evenly' }}>
              {Object.entries(productDic.vars).map(([key, value], id) => {
                return (
                  <li key={key}>
                    <button data-isactive={id === 0 && selectedVar === null ? 'true' : (selectedVar === key).toString()} onClick={() => { if (selectedVar === key) return; setSelectedVar(key); setSelectedSize(SortSizes(Object.keys(productDic.vars[key].varSizesQuantity) as sizeKey[])[0]); restartAnimation(); }}>
                      <img src={value['color-img'].link ? ImageUrl(value['color-img'].link) : undefined} alt='' style={{ display: (thirdLayerPageIsActive.isActive && !tlIsClosing) ? 'none' : 'initial' }} />
                      <p>{key}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
            <span style={{ flex: 1 }}></span>
          </div>
          <div className='pv-sections-grid-container'>
            <div className='pv-grid-section'>
              <div className='pv-stock-and-quantity'>
                <div className='pv-s-and-q-pies-container'>
                  <div className='pv-s-and-q-bg-pie'>
                    <svg id="a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="-45 -45 590 590">
                      <path className="b" d="M74.45,427.99S0,366.03,0,250C0,111.93,111.93,0,250,0s250,111.93,250,250c0,113.86-74.45,177.99-74.45,177.99" />
                    </svg>
                  </div>
                  <div key={animationKey} className='pv-s-and-q-colored-pie' ref={pieRef} data-isactive={pieIsInView.toString()}>
                    <svg id="a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="-45 -45 590 590">
                      <defs>
                        <linearGradient id="linear" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={colorsList?.[selectedSize][0]} />
                          <stop offset="100%" stopColor={colorsList?.[selectedSize][1]} />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation={theme === 'dark' ? 7 : 10} result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <path key={animationKey} style={{ ['--strokeOffsetValue' as string]: strokeOffsetValue }} className="b" d="M74.45,427.99S0,366.03,0,250C0,111.93,111.93,0,250,0s250,111.93,250,250c0,113.86-74.45,177.99-74.45,177.99" />
                    </svg>
                    <svg id="a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="-45 -45 590 590">
                      <path key={animationKey} style={{ ['--strokeOffsetValue' as string]: strokeOffsetValue }} className="b" d="M74.45,427.99S0,366.03,0,250C0,111.93,111.93,0,250,0s250,111.93,250,250c0,113.86-74.45,177.99-74.45,177.99" />
                    </svg>
                  </div>
                  <div className='pv-stock-percentage' style={pieIsInView ? { ['--myColor1' as string]: `${colorsList?.[selectedSize][0]}`, ['--myColor2' as string]: `${colorsList?.[selectedSize][1]}` } : { ['--myColor1' as string]: '#80808033', ['--myColor2' as string]: '#80808033' }}>
                    <p key={animationKey} style={{ ['--value' as string]: !pieIsInView ? 0 : Math.round((currentTotal / (currentTotal + totalSales)) * 100) }}></p>
                  </div>
                  <ul className="pv-sizes-container">
                    {SortSizes(Object.keys(productDic.sizes) as sizeKey[]).map((size, i) =>
                      <li key={i}>
                        {Object.keys(productDic.vars[selectedVar].varSizesQuantity).includes(size) ?
                          <button onClick={() => { if (selectedSize === size) return; setSelectedSize(size); restartAnimation() }}>
                            <p style={{ ['--color1' as string]: `${colorsList?.[selectedSize][0]}`, ['--color2' as string]: `${colorsList?.[selectedSize][1]}` }} data-isactive={selectedSize === size ? 'true' : 'false'}>{size}</p>
                          </button>
                          :
                          <button disabled>
                            <p data-isactive='false'>{size}</p>
                          </button>
                        }
                      </li>
                    )}
                  </ul>
                </div>
                <div className='pv-s-and-q-numbers-container' ref={numsRef}>
                  <div data-isactive={numsIsInView.toString()} style={numsIsInView ? { ['--myColor1' as string]: `${colorsList?.[selectedSize][0]}`, ['--myColor2' as string]: `${colorsList?.[selectedSize][1]}` } : { ['--myColor1' as string]: '#80808033', ['--myColor2' as string]: '#80808033' }}>
                    <p key={animationKey} className='pv-s-and-q-num' style={{ ['--value' as string]: !pieIsInView ? 0 : currentTotal + totalSales }}></p>
                    <p>total stock</p>
                  </div>
                  <div data-isactive={numsIsInView.toString()} style={numsIsInView ? { ['--myColor1' as string]: `${colorsList?.[selectedSize][0]}`, ['--myColor2' as string]: `${colorsList?.[selectedSize][1]}` } : { ['--myColor1' as string]: '#80808033', ['--myColor2' as string]: '#80808033' }}>
                    <p key={animationKey} className='pv-s-and-q-num' style={{ ['--value' as string]: !pieIsInView ? 0 : totalSales }}></p>
                    <p>current sales</p>
                  </div>
                  <div data-isactive={numsIsInView.toString()} style={numsIsInView ? { ['--myColor1' as string]: `${colorsList?.[selectedSize][0]}`, ['--myColor2' as string]: `${colorsList?.[selectedSize][1]}` } : { ['--myColor1' as string]: '#80808033', ['--myColor2' as string]: '#80808033' }}>
                    <p key={animationKey} className='pv-s-and-q-num' style={{ ['--value' as string]: !pieIsInView ? 0 : currentTotal }}></p>
                    <p>remaining</p>
                  </div>
                </div>
              </div>
            </div>
            <div className='pv-grid-section'>
              <div className='pv-attributes-container'>
                <p className='pv-attributes-title'>product attributes</p>
                <table>
                  <tbody>
                    {[...Object.entries(productDic.attributes).filter(([a,]) => a !== 'extra').sort(), ['extra', productDic.attributes.extra]].map(([attr, value], id) => {
                      return (
                        <tr key={id} onClick={() => navigator.clipboard.writeText('')}>
                          <td>{(attr?.replace('_', ' '))}</td>
                          <td>{value === null ? '-' : value}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className='pv-grid-section'>
              <div className='pv-model-container'>
                <div className='pv-model-section'>
                  <img src={productDic.vars[selectedVar].model['model-pfp'] ? ImageUrl(productDic.vars[selectedVar].model['model-pfp']) : undefined} alt='model' />
                  <p className='pv-model-name'>{`${productDic.vars[selectedVar].model['model-f-name']} ${productDic.vars[selectedVar].model['model-l-name']}`}</p>
                </div>
                <div className='pv-model-section'>
                  <div className='pv-model-contact-info'>
                    <button>
                      <img className='button-icon' src={ImageUrl('ui-images/phone-icon.svg')} alt='' />
                    </button>
                    <button>
                      <img className='button-icon' src={ImageUrl('ui-images/email-icon.svg')} alt='' />
                    </button>
                    <button>
                      <img className='button-icon' src={ImageUrl('ui-images/instagram-icon.svg')} alt='' />
                    </button>
                  </div>
                  <div className='pv-model-meas-container'>
                    <div>
                      <p className='pv-model-meas-value'>{productDic.vars[selectedVar].model['model-height']}</p>
                      <p className='pv-model-meas-title'>height</p>
                    </div>
                    <div>
                      <p className='pv-model-meas-value'>{productDic.vars[selectedVar].model['model-bust']}</p>
                      <p className='pv-model-meas-title'>bust</p>
                    </div>
                    <div>
                      <p className='pv-model-meas-value'>{productDic.vars[selectedVar].model['model-waist']}</p>
                      <p className='pv-model-meas-title'>waist</p>
                    </div>
                    <div>
                      <p className='pv-model-meas-value'>{productDic.vars[selectedVar].model['model-hips']}</p>
                      <p className='pv-model-meas-title'>hips</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      }
    </div>
  )
}