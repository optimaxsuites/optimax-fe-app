import { Injectable } from "@angular/core";

type UserRegData = {
	accessToken: string;
	accountId: string;
	email: string;
	id: number;
	project: string;
	provider: string;
	roles: Array<"ROLE_USER">;
	tokenType: string;
	username: string;
};

@Injectable({
	providedIn: "root",
})
export class UserService {
	constructor() {}

	getUserData(): UserRegData | null {
		const userRegDataJSON = sessionStorage.getItem("userRegData");

		if (!userRegDataJSON) return null;

		return JSON.parse(userRegDataJSON);
	}

	get isUser():
		| { isUser: true; userId: number }
		| { isUser: false; userId: null } {
		const userData = this.getUserData();

		if (!userData || !userData.roles.includes("ROLE_USER"))
			return { isUser: false, userId: null };

		return { isUser: true, userId: userData.id };
	}
}
