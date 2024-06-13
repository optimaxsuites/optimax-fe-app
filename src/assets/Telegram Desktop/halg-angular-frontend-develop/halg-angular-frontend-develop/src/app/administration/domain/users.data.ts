export interface UserData{
    username: string;
    password: string;
    loginstatus: boolean;
    userid:number;
    user_type_id: number;
    created_date: number;
    created_by: number;
    fingerprintclient: string;
    fingerprintmatcher: string;
    usersinformation: UserInformation;
  

}
export interface UserAuthData{
    token: string;
    userData: UserData;
}

/*export interface UserData{
    username: string;
    password: string;
    loginstatus: boolean;
    user_type_id: number;
}*/

export interface UserInformation{

    user_role_id: number;
    implementing_partner_id: number;
    userid: number;
    lastname: string;
    firstname: string;
    othername: string;
    phone_number: string;
    email: string;
    contact_address: string;
    operational_unit_id: number;
    picture_id: string;
    mobile_app_acesss: boolean;
    web_app_acesss: boolean;
}
