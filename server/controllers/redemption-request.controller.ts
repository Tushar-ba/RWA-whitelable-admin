import { Request, Response } from 'express';
import { RedemptionRequestService } from '../services/redemption-request.service';

export class RedemptionRequestController {
  private redemptionRequestService: RedemptionRequestService;

  constructor() {
    this.redemptionRequestService = new RedemptionRequestService();
  }

  getAllRedemptionRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const requests = await this.redemptionRequestService.getAllRedemptionRequests();
      
      res.json(requests);
    } catch (error) {
      console.error('Get redemption requests error:', error);
      res.status(500).json({ message: "Failed to fetch redemption requests" });
    }
  };

  getRedemptionRequestById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const request = await this.redemptionRequestService.getRedemptionRequestById(id);
      
      if (!request) {
        res.status(404).json({ message: "Redemption request not found" });
        return;
      }
      
      res.json(request);
    } catch (error) {
      console.error('Get redemption request error:', error);
      res.status(500).json({ message: "Failed to fetch redemption request" });
    }
  };

  updateRedemptionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const request = await this.redemptionRequestService.updateRedemptionRequest(id, updates);
      
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }
      
      res.json(request);
    } catch (error) {
      console.error('Update redemption request error:', error);
      res.status(400).json({ message: "Failed to update request" });
    }
  };
}