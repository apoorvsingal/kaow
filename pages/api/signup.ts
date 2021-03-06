import { AuthHandler } from "../../lib/auth/server";
import { serialize } from "cookie";
import { NextApiRequest, NextApiResponse } from "next";
import { error, firebase } from "../../lib/middlewares";
import { NewUser } from "../../lib/data";

const authHandler = new AuthHandler;

export default error(firebase(async (req: NextApiRequest, res: NextApiResponse) => {
	const { idToken, user }: { idToken: string, user: NewUser } = req.body;

	if(!user.username || typeof user.username != "string" || user.username.length < 3 || user.username.length > 24){
		res.status(400).send({ error: "Invalid username" });
	}
	if(user.bio && (typeof user.bio != "string" || user.bio.length > 128)){
		res.status(400).send({ error: "Invalid bio" });
	}
	try {
		await authHandler.createUser(idToken, user);
		const sessionCookie = await authHandler.getSessionCookie(idToken);
		
		res.setHeader("Set-Cookie", serialize("session", sessionCookie.cookie, { maxAge: sessionCookie.maxAge, httpOnly: true, secure: process.env.NODE_ENV == "production", path: "/" }));
		res.send({ ok: true });
	} catch(error){
		console.error(error);
		res.send({ error: error.message });
	}
}));