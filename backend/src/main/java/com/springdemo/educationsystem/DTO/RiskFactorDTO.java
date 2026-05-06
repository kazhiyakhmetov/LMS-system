package com.springdemo.educationsystem.DTO;

public class RiskFactorDTO {
    private String feature;     // e.g. "overdue_count"
    private String label;       // localized: "Просрочено"
    private double value;       // raw feature value at prediction time
    private String direction;   // "up" (high is bad) or "down" (low is bad)

    public RiskFactorDTO() {}

    public String getFeature() { return feature; }
    public void setFeature(String feature) { this.feature = feature; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
}
