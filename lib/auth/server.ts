import admin, { credential } from "../firebase/admin";
import { Database } from "../db";
import { User, NewUser, UserInfo, UserRole } from "../data";

export class AuthHandler {
	private _db: Database;

	constructor(db?: Database){
		this._db = db || new Database;
	}
	async init(){
		await this._db.init();
	}
	async createUser(idToken: string, userMeta: NewUser): Promise<User> {
		const { uid } = await this.verifyIdToken(idToken);
		const firebaseUser = await admin.auth().getUser(uid);

		if((await this._db.users().find([["username", "==", userMeta.username]], { limit: 1})).length == 1){
			await admin.auth().deleteUser(uid);
			throw new Error("username already exists");
		}
		const user: User = new User(uid, {
			username: userMeta.username,
			bio: userMeta.bio || "",
			role: UserRole.USER,
			upvotes: 0,
			completedProjectTypes: [],
			startedProjectTypes: []
		});
		await this._db.users().save(user, { upsert: true });
		return user;
	};
	async getUser(uid: string): Promise<UserInfo> {
		const [firebaseUser, { data }]: [admin.auth.UserRecord, User] = await Promise.all([admin.auth().getUser(uid), this._db.users().get(uid)]);

		return {
			uid: firebaseUser.uid,
			displayName: firebaseUser.displayName || null,
			email: firebaseUser.email || null,
			photoURL: firebaseUser.photoURL || null,
			username: data.username,
			upvotes: data.upvotes,
			role: data.role,
			bio: data.bio
		};
	};
	verifyIdToken(idToken: string){
		return admin.auth().verifyIdToken(idToken);
	};
	createCustomToken(uid: string){
		return admin.auth().createCustomToken(uid);
	};
	async getSessionCookie(idToken: string): Promise<{ cookie: string, maxAge: number }> {
		const { auth_time } = await this.verifyIdToken(idToken);
		
		if (new Date().getTime() / 1000 - auth_time > 5 * 60) {
			throw new Error("Inalid ID Token");
		}
		const expiresIn = 1000 * 60 * 60 * 24 * 5;

		return {
			cookie: await admin.auth().createSessionCookie(idToken, { expiresIn }),
			maxAge: expiresIn
		};
	};
	verifySessionCookie(cookie: string): Promise<admin.auth.DecodedIdToken> {
		return admin.auth().verifySessionCookie(cookie, true);
	};
};