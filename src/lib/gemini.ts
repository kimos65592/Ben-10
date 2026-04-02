import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private audioQueue: Float32Array[] = [];

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async connect(callbacks: {
    voiceName?: string;
    onOpen?: () => void;
    onMessage?: (message: LiveServerMessage) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
  }) {
    // Re-initialize AI to ensure fresh API key
    // Prioritize GEMINI_API_KEY (free environment key)
    const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
    
    if (!apiKey) {
      console.error("No API key found. Please ensure GEMINI_API_KEY is set.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    this.session = await this.ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onopen: async () => {
          await this.setupAudio();
          callbacks.onOpen?.();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.interrupted) {
            this.stopAudio();
          }
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                await this.handleAudioOutput(part.inlineData.data);
              }
            }
          }
          callbacks.onMessage?.(message);
        },
        onerror: (err) => {
          console.error("Gemini Session Error:", err);
          callbacks.onError?.(err);
        },
        onclose: callbacks.onClose,
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: callbacks.voiceName || "Zephyr" } },
        },
        systemInstruction: "أنت المساعد الذكي الخاص بـ Ben 10، تعيش داخل ساعة الأومنيتريكس. تحدث باللغة العربية العامية المصرية. موقعك الحالي هو 'العبور، القليوبية، مصر'. يمكنك مساعدة المستخدم في معرفة الوقت، الطقس، الأخبار، والموقع، والقيام بأي مهام أخرى بأسلوب تقني ومستقبلي.",
      },
    });
    return this.session;
  }

  private async setupAudio() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.nextStartTime = this.audioContext.currentTime;
  }

  private async handleAudioOutput(base64Data: string) {
    if (!this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pcmData = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  stopAudio() {
    this.nextStartTime = this.audioContext?.currentTime || 0;
    // Note: To truly stop current playback, we'd need to track all active sources
  }

  async sendAudio(base64Data: string) {
    if (this.session) {
      await this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
      });
    }
  }

  async sendText(text: string) {
    if (this.session) {
      await this.session.sendRealtimeInput({
        text: text,
      });
    }
  }

  close() {
    this.session?.close();
    this.audioContext?.close();
  }
}
