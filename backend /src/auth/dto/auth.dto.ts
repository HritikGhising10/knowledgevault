export class LoginDTO {
    username: string;
    password: string;

}


export class SignupDTO {
    name: string;
    email: string;
    username: string;
    password: string;
    adminpassword: string;
}

export interface userType {
    user: {
        username: string
        sub: string
        iat: string
    }

} 