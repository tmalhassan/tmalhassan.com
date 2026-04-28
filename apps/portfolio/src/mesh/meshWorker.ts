import generateMeshFromIslands from "./meshCore";

self.onmessage = (e: MessageEvent) => {
  const { key, params } = e.data;

  try {
    const pieces = generateMeshFromIslands(params);

    console.log("marking as done!");
    self.postMessage({
      key,
      status: 'done',
      pieces
    });
  } catch (err: any) {
    self.postMessage({
      key,
      status: 'error',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
};