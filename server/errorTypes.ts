const UNDEFINED_DUT_TO_UNSET = 'undefined-due-to-unset';
const NETWORK_UNEXPECTED = 'network-unexpected';

const UNMEET_DATA_FIELD = 'unmeet-data-field';

export const USERNAME_USE_BEFORE_SET = `${UNDEFINED_DUT_TO_UNSET} user name hasn\'t been set yet, should use login() before getUserName()`;
export const PASSWORD_USE_BEFORE_SET = `${UNDEFINED_DUT_TO_UNSET} user password hasn\'t been set yet, should use login() before getPassWord()`;
export const TOKEN_USE_BEFORE_SET = `${UNDEFINED_DUT_TO_UNSET} user token hasn\'t been set yet, should use login() before getToken()`;
export const USERMETA_USE_BEFORE_SET = `${UNDEFINED_DUT_TO_UNSET} user metadata hasn\'t been set yet, should use login() before query any field of UserType`;

export const API_FAILURE = `${NETWORK_UNEXPECTED} api endpoint returning unexpected response, should check whether api server was down or check the usage of api`;
export const NO_TOKEN = `${NETWORK_UNEXPECTED} api endpoing need token, but you may supply with an empty string in connector`;

export const MODEL_DONT_HAVE_THIS_FIELD = `${UNMEET_DATA_FIELD} probably you are query wrong data in resolver function, since model don\'t have this kind of data`;