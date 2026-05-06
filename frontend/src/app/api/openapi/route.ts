import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Clothing Store Management API",
      version: "1.0.0",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health": {
        get: {
          summary: "Health check",
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/admin/import/products/preview": {
        post: {
          summary: "Preview Excel import",
          requestBody: { required: true },
          responses: { 200: { description: "Preview result" }, 401: { description: "Unauthorized" } },
        },
      },
      "/api/admin/import/products/commit": {
        post: {
          summary: "Commit Excel import",
          requestBody: { required: true },
          responses: { 200: { description: "Commit result" }, 400: { description: "Validation failed" }, 401: { description: "Unauthorized" } },
        },
      },
      "/api/admin/import/batches": {
        get: {
          summary: "List import batches",
          responses: { 200: { description: "Batches" }, 401: { description: "Unauthorized" } },
        },
      },
      "/api/admin/import/batches/{id}/errors": {
        get: {
          summary: "Download error CSV",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "CSV" }, 401: { description: "Unauthorized" } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}

