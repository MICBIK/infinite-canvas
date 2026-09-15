export type ReferenceImageUploadState = {
    state: "uploading" | "ready" | "error";
    progress: number;
};

export type ReferenceImage = {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
    url?: string;
    storageKey?: string;
    /** 素材通道上传后的公开读 URL（画布生成时据此引用素材）。 */
    remoteUrl?: string;
    /** 素材通道直传进度；ready 表示 remoteUrl 可用。 */
    upload?: ReferenceImageUploadState;
};
