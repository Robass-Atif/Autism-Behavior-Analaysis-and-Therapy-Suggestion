import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly thumbnailDir = path.resolve("./uploads/thumbnails");

  constructor() {
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  async generateFromBuffer(
    videoBuffer: Buffer,
    sourceExt: string,
  ): Promise<{ thumbnailUrl: string } | null> {
    const tmpInput = path.join(
      os.tmpdir(),
      `thumb-src-${crypto.randomBytes(8).toString("hex")}${sourceExt || ".mp4"}`,
    );
    const filename = `thumb-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.jpg`;
    const outputPath = path.join(this.thumbnailDir, filename);

    try {
      fs.writeFileSync(tmpInput, videoBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpInput)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err))
          .screenshots({
            timestamps: ["00:00:01.000"],
            filename,
            folder: this.thumbnailDir,
            size: "640x?",
          });
      });

      if (!fs.existsSync(outputPath)) {
        this.logger.warn(`ffmpeg succeeded but output missing: ${outputPath}`);
        return null;
      }

      return { thumbnailUrl: `/uploads/thumbnails/${filename}` };
    } catch (err) {
      this.logger.error(
        `Thumbnail generation failed: ${(err as Error).message}`,
      );
      return null;
    } finally {
      try {
        if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
      } catch {}
    }
  }
}
