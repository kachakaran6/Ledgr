import type { FastifyPluginAsync } from 'fastify';
import { ExportRequestSchema } from '@ledgr/shared';
import { ExportService } from '../services/export.service';

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // Export to PDF
  fastify.post('/pdf', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({ ...((request.body as object) || {}), format: 'pdf' });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid export options');
    }

    const pdfBuffer = await ExportService.generatePdf(request.user.id, parseRes.data);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="logpast-export-${Date.now()}.pdf"`);
    return reply.send(pdfBuffer);
  });

  // Export to XLSX (Excel)
  fastify.post('/xlsx', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({ ...((request.body as object) || {}), format: 'xlsx' });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid export options');
    }

    const xlsxBuffer = await ExportService.generateExcel(request.user.id, parseRes.data);

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="logpast-export-${Date.now()}.xlsx"`);
    return reply.send(xlsxBuffer);
  });

  // Export to CSV
  fastify.post('/csv', async (request, reply) => {
    const parseRes = ExportRequestSchema.safeParse({ ...((request.body as object) || {}), format: 'csv' });
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid export options');
    }

    const csvContent = await ExportService.generateCsv(request.user.id, parseRes.data);

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="logpast-export-${Date.now()}.csv"`);
    return reply.send(csvContent);
  });
};
