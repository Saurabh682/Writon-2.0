package com.ibitvalley.writon.classes.model;

public class SocialLoginBody {


    String Pname;
    String Uname;
    String Email;
    String Provider;
    String ProviderId;

    public String getPenName() {
        return Pname;
    }

    public void setPenName(String penName) {
        Pname = penName;
    }

    public String getEmail() {
        return Email;
    }

    public void setEmail(String email) {
        Email = email;
    }

    public String getName() {
        return Uname;
    }

    public void setName(String name) {
        Uname = name;
    }

    public String getProvider() {
        return Provider;
    }

    public void setProvider(String provider) {
        Provider = provider;
    }

    public String getProviderId() {
        return ProviderId;
    }

    public void setProviderId(String providerId) {
        ProviderId = providerId;
    }
}
