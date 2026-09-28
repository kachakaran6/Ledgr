import type { FastifyPluginAsync } from 'fastify';
import { ExportRequestSchema } from '@ledgr/shared';
import { ExportService } from '../services/export.service.js';

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── Export to PDF ──────────────────────────────────────────────────────────
  fastify.post('/pdf', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({
      ...((request.body as object) || {}),
      format: 'pdf',
    });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(
        parseRes.error.errors[0]?.message || 'Invalid export options'
      );
    }

    let result: { buffer: Buffer; filename: string };
    try {
      result = await ExportService.generatePdf(request.user.id, parseRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Friendly error for zero-entries case
      if (msg.startsWith('NO_ENTRIES:')) {
        throw fastify.httpErrors.badRequest(msg.replace('NO_ENTRIES: ', ''));
      }
      // Log and re-throw any unexpected errors
      fastify.log.error({ err }, 'PDF export failed');
      throw fastify.httpErrors.internalServerError(
        'Export failed — an error occurred while generating the PDF. Please try again.'
      );
    }

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}.pdf"`
    );
    return reply.send(result.buffer);
  });

  // ─── Export to XLSX ─────────────────────────────────────────────────────────
  fastify.post('/xlsx', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({
      ...((request.body as object) || {}),
      format: 'xlsx',
    });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(
        parseRes.error.errors[0]?.message || 'Invalid export options'
      );
    }

    let result: { buffer: Buffer; filename: string };
    try {
      result = await ExportService.generateExcel(request.user.id, parseRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('NO_ENTRIES:')) {
        throw fastify.httpErrors.badRequest(msg.replace('NO_ENTRIES: ', ''));
      }
      fastify.log.error({ err }, 'Excel export failed');
      throw fastify.httpErrors.internalServerError(
        'Export failed — an error occurred while generating the spreadsheet. Please try again.'
      );
    }

    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}.xlsx"`
    );
    return reply.send(result.buffer);
  });

  // ─── Export to CSV ──────────────────────────────────────────────────────────
  fastify.post('/csv', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({
      ...((request.body as object) || {}),
      format: 'csv',
    });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(
        parseRes.error.errors[0]?.message || 'Invalid export options'
      );
    }

    let result: { content: string; filename: string };
    try {
      result = await ExportService.generateCsv(request.user.id, parseRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('NO_ENTRIES:')) {
        throw fastify.httpErrors.badRequest(msg.replace('NO_ENTRIES: ', ''));
      }
      fastify.log.error({ err }, 'CSV export failed');
      throw fastify.httpErrors.internalServerError(
        'Export failed — an error occurred while generating the CSV. Please try again.'
      );
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}.csv"`
    );
    return reply.send(result.content);
  });
};
