import { OpenAPIHono } from "@hono/zod-openapi";
import { auth, oauth } from "./auth.js";
import { goals } from "./goals.js";
import { todos } from "./todos.js";
import { notes } from "./notes.js";
import { favorites } from "./favorites.js";
import { users, usersPublic } from "./users.js";
import { posts } from "./posts.js";
import { notifications } from "./notifications.js";
import { images, files } from "./uploads.js";

const routes = new OpenAPIHono();

routes.route("/:teamId/auth", auth);
routes.route("/:teamId/oauth", oauth);
routes.route("/:teamId/goals", goals);
routes.route("/:teamId/todos", favorites);
routes.route("/:teamId/todos", todos);
routes.route("/:teamId/notes", notes);
routes.route("/:teamId/notifications", notifications);
routes.route("/:teamId/users", usersPublic);
routes.route("/:teamId/users/me", users);
routes.route("/:teamId/posts", posts);
routes.route("/:teamId/images", images);
routes.route("/:teamId/files", files);

export default routes;
