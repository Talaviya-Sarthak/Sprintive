import { kanbanService } from '../services/kanban.service.js';

export const kanbanController = {
  /**
   * GET /api/teams/:teamId/kanban
   * Optional query param: ?meeting_id=<uuid>
   */
  async getKanban(req, res, next) {
    try {
      const { teamId } = req.params;
      const { meeting_id } = req.query;
      const data = await kanbanService.getKanban(teamId, req.user.id, {
        meetingId: meeting_id || null,
      });
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/teams/:teamId/kanban/tickets/:ticketId/status
   * Body: { status: 'todo' | 'in_progress' | 'review' | 'done' | 'backlog' }
   */
  async updateTicketStatus(req, res, next) {
    try {
      const { teamId, ticketId } = req.params;
      const { status } = req.body;
      const data = await kanbanService.updateTicketStatus(
        teamId,
        ticketId,
        status,
        req.user.id
      );
      return res.json({
        success: true,
        message: 'Ticket status updated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};
