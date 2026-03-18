
/**
 * Utility to extract frames from a video URL.
 */
export const extractFrames = async (videoUrl: string, count: number = 8): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; // Support cross-origin thumbnails if enabled on server
        video.src = videoUrl;
        video.load();

        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const frames: string[] = [];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            for (let i = 0; i < count; i++) {
                const time = (duration / (count + 1)) * (i + 1);
                video.currentTime = time;
                
                await new Promise((r) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            frames.push(canvas.toDataURL('image/jpeg', 0.8));
                        }
                        r(true);
                    };
                    video.addEventListener('seeked', onSeeked);
                });
            }
            resolve(frames);
        };

        video.onerror = (e) => reject(e);
    });
};

/**
 * Utility to extract a single frame from a video URL at a specific time.
 */
export const extractFrameAtTime = async (videoUrl: string, time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.load();

        video.onloadedmetadata = () => {
            video.currentTime = time;
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    reject(new Error("Canvas context not found"));
                }
            };
        };

        video.onerror = (e) => reject(e);
    });
};
