interface Navigator {
  gpu?: {
    requestAdapter(): Promise<GPUAdapter | null>;
  };
}
