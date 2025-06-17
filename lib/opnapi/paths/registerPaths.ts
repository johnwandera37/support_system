import { registerAdminActionPaths } from "./admin/action";
import { registerAgents } from "./admin/agents";
import { registerAgentRequests } from "./admin/agents-requests";
import { regigisterUpdateProfile } from "./admin/update-profile";
import { regigisterUpdateDepartment } from "./admin/updateDepartment";
import { regigisterLogin } from "./auth/login";
import { regigisterLogout } from "./auth/logout";
import { regigisterRefresh } from "./auth/refresh";
import { regigisterSignup } from "./auth/signup";
import { regigisterTicket } from "./tickets/ticket";
import { regigisterTickets } from "./tickets/tickets";
// A Central Path Registration File
export function registerAllPaths() {
    // Admin
    registerAdminActionPaths();
    registerAgentRequests();
    registerAgents();
    regigisterUpdateProfile();
    regigisterUpdateDepartment();

    // Auth
    regigisterSignup();
    regigisterLogin();
    regigisterRefresh();
    regigisterLogout();

    // Tickets
    regigisterTickets();
    regigisterTicket();

}