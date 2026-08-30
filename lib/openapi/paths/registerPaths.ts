import { registerAdminActionPaths } from "./admin/action";
import { registerAgents } from "./admin/agents";
import { registerAgentRequests } from "./admin/agents-requests";
import { regigisterUpdateProfile } from "./admin/update-profile";
import { regigisterUpdateDepartment } from "./admin/updateDepartment";
import { registerGetAdmins } from "./admins/get-admins";
import { registerAccessTokenRoute } from "./auth/access";
import { regigisterLogin } from "./auth/login";
import { regigisterLogout } from "./auth/logout";
import { registerMeRoute } from "./auth/me";
import { regigisterRefresh } from "./auth/refresh";
import { regigisterSignup } from "./auth/signup";
import { registerComment } from "./comments/comment";
import { registerComments } from "./comments/comments";
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

    // Admins
    registerGetAdmins()

    // Auth
    regigisterSignup();
    regigisterLogin();
    regigisterRefresh();
    regigisterLogout();
    registerAccessTokenRoute();
    registerMeRoute();

    // Tickets
    regigisterTickets();
    regigisterTicket();

    // Comments
    registerComments();
    registerComment();

}