import { readAdminStats } from "../repositories/adminRepository.js";
import { getTicketStats } from "./ticketService.js";

export async function getAdminStats() {
  const [bookingStats, ticketStats] = await Promise.all([
    readAdminStats(),
    getTicketStats(),
  ]);

  return { ...bookingStats, ticketStats };
}
