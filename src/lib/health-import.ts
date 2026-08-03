/**
 * Extracts body-mass readings from an Apple Health export, in the browser.
 *
 * The export zip is ~10MB but `export.xml` inflates to hundreds of megabytes,
 * which is far past what a serverless request body allows. So the zip is
 * streamed and scanned here, and only the extracted readings — a few dozen
 * rows — are ever sent to the server. The raw health data never leaves the
 * device.
 */

export type HealthReading = { date: string; weightLbs: number; source: string };

export type HealthScan = {
  readings: HealthReading[];
  /** Reading count per source app, so the user can see where data came from. */
  bySource: Record<string, number>;
  bytesScanned: number;
};

const KG_TO_LBS = 2.2046226218;

// One Record element per line in practice, but the scanner never assumes that —
// it matches across a rolling buffer so records split across chunks still parse.
const RECORD = /<Record type="HKQuantityTypeIdentifierBodyMass"[^>]*?>/g;
const ATTR = /(\w+)="([^"]*)"/g;

/**
 * Streams the zip, scans only `export.xml`, and returns one reading per day.
 * `onProgress` receives bytes inflated so far, for a progress indicator.
 */
export async function scanHealthExport(
  file: File,
  onProgress?: (bytesScanned: number) => void,
): Promise<HealthScan> {
  const { Unzip, UnzipInflate } = await import("fflate");

  return new Promise<HealthScan>((resolve, reject) => {
    // Latest reading wins for a given day, matching "re-weighing corrects it".
    const byDay = new Map<string, HealthReading>();
    const bySource: Record<string, number> = {};
    let bytesScanned = 0;
    let carry = "";
    let found = false;
    let settled = false;

    const decoder = new TextDecoder("utf-8");

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) return reject(error);
      if (!found) {
        return reject(
          new Error(
            "No export.xml inside that zip — pick the file Apple Health gave you, unmodified.",
          ),
        );
      }
      const readings = [...byDay.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      resolve({ readings, bySource, bytesScanned });
    };

    function scan(text: string) {
      // Keep a tail long enough that a Record tag split across chunks still
      // matches once the next chunk arrives.
      const buffer = carry + text;
      let lastEnd = 0;

      RECORD.lastIndex = 0;
      for (let m = RECORD.exec(buffer); m; m = RECORD.exec(buffer)) {
        lastEnd = m.index + m[0].length;
        const attrs: Record<string, string> = {};
        ATTR.lastIndex = 0;
        for (let a = ATTR.exec(m[0]); a; a = ATTR.exec(m[0])) {
          attrs[a[1]] = a[2];
        }

        const reading = toReading(attrs);
        if (!reading) continue;

        byDay.set(reading.date, reading);
        bySource[reading.source] = (bySource[reading.source] ?? 0) + 1;
      }

      carry = buffer.slice(Math.max(lastEnd, buffer.length - 2048));
    }

    const unzip = new Unzip((stream) => {
      // Ignore __MACOSX/ resource forks and any other member.
      if (!stream.name.endsWith("export.xml") || stream.name.startsWith("__MACOSX")) {
        return;
      }
      found = true;

      stream.ondata = (err, chunk, final) => {
        if (err) return finish(err);
        bytesScanned += chunk.length;
        scan(decoder.decode(chunk, { stream: !final }));
        onProgress?.(bytesScanned);
        if (final) finish();
      };
      stream.start();
    });
    unzip.register(UnzipInflate);

    // Feed the zip in slices so the whole file is never held twice in memory.
    const CHUNK = 4 * 1024 * 1024;
    let offset = 0;

    (async () => {
      try {
        while (offset < file.size) {
          const slice = file.slice(offset, offset + CHUNK);
          const bytes = new Uint8Array(await slice.arrayBuffer());
          offset += CHUNK;
          unzip.push(bytes, offset >= file.size);
        }
        // A zip with no export.xml never fires `final`, so settle here.
        finish();
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  });
}

function toReading(attrs: Record<string, string>): HealthReading | null {
  const start = attrs.startDate;
  const raw = Number(attrs.value);
  if (!start || !Number.isFinite(raw) || raw <= 0) return null;

  // startDate carries the local UTC offset at the time of the reading, so its
  // date part is already the correct local day — no conversion needed.
  const date = start.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const unit = (attrs.unit ?? "lb").toLowerCase();
  const weightLbs = unit === "kg" ? raw * KG_TO_LBS : raw;

  return {
    date,
    weightLbs: Math.round(weightLbs * 10) / 10,
    source: attrs.sourceName || "Unknown",
  };
}
