/**
 * Service de compression d'images produits côté client.
 * Réduit la taille des photos (ex: 5MB -> <200KB WebP/JPEG) avant stockage local ou Supabase.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 à 1.0
  mimeType?: "image/webp" | "image/jpeg";
}

export class ImageCompressionService {
  /**
   * Compresse un fichier Image via HTML5 Canvas et retourne un Blob ou un Data URL.
   */
  async compressImage(
    file: File,
    options: ImageCompressionOptions = {}
  ): Promise<{ blob: Blob; dataUrl: string }> {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.8,
      mimeType = "image/webp",
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calcul des dimensions conservant le ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Impossible d'obtenir le contexte Canvas 2D"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Échec de compression de l'image"));
                return;
              }

              const compressedReader = new FileReader();
              compressedReader.onloadend = () => {
                resolve({
                  blob,
                  dataUrl: compressedReader.result as string,
                });
              };
              compressedReader.readAsDataURL(blob);
            },
            mimeType,
            quality
          );
        };

        img.onerror = () => reject(new Error("Fichier image corrompu"));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(file);
    });
  }
}

export const imageCompressionService = new ImageCompressionService();
