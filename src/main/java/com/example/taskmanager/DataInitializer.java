package com.example.taskmanager;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final StatusRepository statusRepository;

    public DataInitializer(StatusRepository statusRepository) {
        this.statusRepository = statusRepository;
    }

    @Override
    public void run(String... args) {
        seedStatus(1L, "active");
        seedStatus(2L, "completed");
        seedStatus(3L, "in progress");
    }

    private void seedStatus(Long id, String state) {
        if (!statusRepository.existsById(id)) {
            Status s = new Status();
            s.setStatusID(id);
            s.setState(state);
            statusRepository.save(s);
        }
    }
}
