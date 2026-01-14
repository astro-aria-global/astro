import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import matter from "gray-matter";
import * as argon2 from "argon2";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import slugify from "slugify";
import Cloudflare from "cloudflare";

// This is pre-build script to upload hashed values to kv

// Step 1: Introduce environment variables
const CONTENT_DIR = "src/contents";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_ID = process.env.CF_KV_ID;

// Helper function to handle cli args
const argv = yargs(hideBin(process.argv))
  .option("dry", {
    type: "boolean",
    description: "Run without uploading to KV",
  })
  .option("force", {
    type: "boolean",
    description: "Overwrite existing keys in KV",
  })
  .parseSync();

interface PostFrontmatter {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  draft?: boolean;
  encrypt?: boolean;
  password?: string;
  question?: string;
  slug?: string;
}
interface KvItem {
  key: string;
  value: string;
}

// Helper function to mimic astro slug process
const getSlug = (filePath: string, frontmatter: PostFrontmatter): string => {
  if (frontmatter.slug) {
    return slugify(frontmatter.slug, { lower: true, strict: true });
  }

  const relative = path.relative(CONTENT_DIR, filePath);
  const cleanPath = relative.replace(/\.[^/.]+$/, "");
  const cleanSlug = cleanPath
    .split(path.sep)
    .map((segment) => slugify(segment, { lower: true, strict: true }))
    .join("/");

  return cleanSlug;
};

async function main() {
  console.log(
    `--- Password Hashing Utility [Dry: ${argv.dry || false}, Force: ${argv.force || false}] ---`,
  );

  if (!argv.dry && (!CF_ACCOUNT_ID || !CF_KV_ID)) {
    console.error(
      "❌ Error: Missing Cloudflare Environment Variables for KV upload.",
    );
    process.exit(1);
  }

  // Step 2: Scan for posts
  const files = globSync(`${CONTENT_DIR}/**/*.md`);
  const itemsToUpload: KvItem[] = [];

  // Step 3: Add hashes for upload
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    const { data: fm } = matter(raw) as unknown as { data: PostFrontmatter };
    const isEncrypted = fm.encrypt === true;
    const hasPassword = fm.password && String(fm.password).trim() !== "";

    // 1. Skip non-protected posts
    if (!isEncrypted && !hasPassword) continue;

    const slug = getSlug(file, fm);

    let targetPassword = "";

    // 2. Handle encrypt=true but password=""
    if (isEncrypted && !hasPassword) {
      if (!DEFAULT_PASSWORD) {
        console.warn(
          `⚠️  [${slug}] Skipped: Encrypt=true but no password provided and no DEFAULT_POST_PASSWORD set.`,
        );
        continue;
      }

      console.warn(`🔸 [${slug}] Warning: using DEFAULT password.`);

      targetPassword = DEFAULT_PASSWORD;
    } else if (hasPassword) {
      // 3. Warn if encrypt=false but password exists
      if (!isEncrypted) {
        console.warn(
          `🔸 [${slug}] Warning: 'encrypt' is false, but 'password' is set. Hashing anyway.`,
        );
      }

      targetPassword = String(fm.password);
    }

    // 4. Calculate argon2 hash and add to upload queue
    const hash = await argon2.hash(targetPassword);

    itemsToUpload.push({ key: `pwd:${slug}`, value: hash });
  }

  // Step 4: Return if no hash to upload
  if (itemsToUpload.length === 0) {
    console.log("✅ No protected posts found.");
    return;
  }

  // Step 5: Dry: Return directly
  if (argv.dry) {
    console.log("🧪 DRY RUN: The script would not upload KV.");
    return;
  }

  // Step 6: Initialize cloudflare client
  const client = new Cloudflare({});

  let finalPayload = itemsToUpload;

  // Step 7: Filter queue if not force
  if (!argv.force) {
    console.log("🔍 Checking for existing keys to avoid overwrite...");

    try {
      const existingKeys = new Set<string>();
      const keysPage = await client.kv.namespaces.keys.list(
        CF_KV_ID as string,
        {
          account_id: CF_ACCOUNT_ID as string,
          limit: 1000,
        },
      );

      for (const key of keysPage.result) {
        if (key.name) existingKeys.add(key.name);

        finalPayload = itemsToUpload.filter((item) => {
          if (existingKeys.has(item.key)) {
            return false;
          }
          return true;
        });
      }
    } catch (error) {
      console.error(
        "❌ Error fetching existing keys:",
        error instanceof Error ? error.name : "UnknownError",
      );
      process.exit(1);
    }
  }

  // Step 8: Return if no new keys
  if (finalPayload.length === 0) {
    console.log("✅ Nothing new to upload.");
    return;
  }

  // Step 9: Update new keys
  try {
    await client.kv.namespaces.bulkUpdate(CF_KV_ID as string, {
      account_id: CF_ACCOUNT_ID as string,
      body: finalPayload,
    });

    console.log(`✅ Bulk Upload Complete!`);
  } catch (error) {
    console.error(
      "❌ Bulk Upload Failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    process.exit(1);
  }
}

main();
