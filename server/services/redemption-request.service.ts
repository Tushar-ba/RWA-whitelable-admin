import {
  RedemptionRequest,
  IRedemptionRequest,
} from "../schemas/redemption-request.schema";
import { AppUser } from "../schemas/user.schema";
import { type InsertRedemptionRequest } from "@shared/schema";

export class RedemptionRequestService {
  async getAllRedemptionRequests(): Promise<IRedemptionRequest[]> {
    try {
      const requests = await RedemptionRequest.find()
        .populate({
          path: "userId",
        })
        .sort({ createdAt: -1 });
      console.log("requests", requests);
      // // For any requests that don't have userId populated but have userEmail,
      // // try to find and attach user data manually
      // const enrichedRequests = await Promise.all(
      //   requests.map(async (request: any) => {
      //     if (!request.userId && request.userEmail) {
      //       const user = await AppUser.findOne({ email: request.userEmail }).lean();
      //       if (user) {
      //         // Update the request with userId for future queries
      //         await RedemptionRequest.findByIdAndUpdate(request._id, { userId: user._id });
      //         // Attach user data to current response
      //         request.userId = {
      //           _id: user._id,
      //           email: user.email,
      //           first_name: user.first_name,
      //           last_name: user.last_name
      //         };
      //       }
      //     }
      //     return request;
      //   })
      // );

      return requests;
    } catch (error) {
      throw new Error(`Error fetching redemption requests: ${error}`);
    }
  }

  async getRedemptionRequestById(
    id: string,
  ): Promise<IRedemptionRequest | null> {
    try {
      const request = await RedemptionRequest.findById(id)
        .populate("userId", "email first_name last_name", "User")
        .lean();

      if (!request) {
        return null;
      }

      // If userId is not populated but we have userEmail, try to find user manually
      if (!request.userId && request.userEmail) {
        const user = await AppUser.findOne({ email: request.userEmail }).lean();
        if (user) {
          // Update the request with userId for future queries
          await RedemptionRequest.findByIdAndUpdate(request._id, {
            userId: user._id as any,
          });
          // Attach user data to current response
          request.userId = {
            _id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          } as any;
        }
      }

      return request;
    } catch (error) {
      throw new Error(`Error finding redemption request: ${error}`);
    }
  }

  async createRedemptionRequest(
    requestData: InsertRedemptionRequest,
  ): Promise<IRedemptionRequest> {
    try {
      const request = new RedemptionRequest(requestData);
      return await request.save();
    } catch (error) {
      throw new Error(`Error creating redemption request: ${error}`);
    }
  }

  async updateRedemptionRequest(
    id: string,
    updateData: Partial<IRedemptionRequest>,
  ): Promise<IRedemptionRequest | null> {
    try {
      // Try to find by MongoDB ObjectId first (for backward compatibility)
      let request = null;
      try {
        request = await RedemptionRequest.findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true },
        );
      } catch (objectIdError) {
        // If ObjectId fails, try to find by requestId field
        request = await RedemptionRequest.findOneAndUpdate(
          { requestId: id },
          { ...updateData, updatedAt: new Date() },
          { new: true },
        );
      }

      return request;
    } catch (error) {
      throw new Error(`Error updating redemption request: ${error}`);
    }
  }

  async getPendingRequestsCount(): Promise<number> {
    try {
      return await RedemptionRequest.countDocuments({});
    } catch (error) {
      throw new Error(`Error counting redemption requests: ${error}`);
    }
  }
}
