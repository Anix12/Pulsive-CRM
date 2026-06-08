export interface InitiateCallParams {
  to: string;
  from: string;
  statusCallbackUrl: string;
  recordingEnabled?: boolean;
}

export interface CallResult {
  providerCallSid: string;
  status: string;
}

export interface CallingProvider {
  readonly name: string;
  initiateCall(params: InitiateCallParams): Promise<CallResult>;
  endCall(providerCallSid: string): Promise<void>;
  getCallStatus(providerCallSid: string): Promise<string>;
  getRecordingUrl(recordingSid: string): Promise<string>;
}
