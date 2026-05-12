package com.springdemo.educationsystem.DTO;

import java.util.ArrayList;
import java.util.List;

public class LibraryBookDTO {
    private String title;
    private List<String> authors;
    private Integer year;
    private String url;
    private String coverUrl;
    private List<String> languages;
    private Integer editionCount;

    public LibraryBookDTO() {
        this.authors = new ArrayList<>();
        this.languages = new ArrayList<>();
    }

    public LibraryBookDTO(String title,
                          List<String> authors,
                          Integer year,
                          String url,
                          String coverUrl,
                          List<String> languages,
                          Integer editionCount) {
        this.title = title;
        this.authors = authors != null ? authors : new ArrayList<>();
        this.year = year;
        this.url = url;
        this.coverUrl = coverUrl;
        this.languages = languages != null ? languages : new ArrayList<>();
        this.editionCount = editionCount;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public List<String> getAuthors() { return authors; }
    public void setAuthors(List<String> authors) { this.authors = authors; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public List<String> getLanguages() { return languages; }
    public void setLanguages(List<String> languages) { this.languages = languages; }

    public Integer getEditionCount() { return editionCount; }
    public void setEditionCount(Integer editionCount) { this.editionCount = editionCount; }
}
