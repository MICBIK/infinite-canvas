export type ReferenceVideo = {
    id: string;
    name: string;
    type: string;
    url: string;
    storageKey?: string;
    bytes?: number;
    width?: number;
    height?: number;
    durationMs?: number;
    /** 素材通道上传后的公开读 URL。 */
    remoteUrl?: string;
};

export type ReferenceAudio = {
    id: string;
    name: string;
    type: string;
    url: string;
    storageKey?: string;
    durationMs?: number;
    /** 素材通道上传后的公开读 URL。 */
    remoteUrl?: string;
};
